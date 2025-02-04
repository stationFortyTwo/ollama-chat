use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tauri::State;

#[derive(Default)]
struct ChatState(Mutex<Vec<Message>>);

#[derive(Serialize, Deserialize, Clone)]
struct Message {
    role: String,
    content: String,
}

#[derive(Serialize, Deserialize)]
struct ModelInfo {
    name: String,
    modified_at: String,
    size: u64,
    digest: String,
}

#[derive(Serialize, Deserialize)]
struct ModelsResponse {
    models: Vec<ModelInfo>,
}

#[derive(Serialize, Deserialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
}

#[derive(Serialize, Deserialize)]
struct GenerateResponse {
    response: String,
}

#[tauri::command]
async fn get_models() -> Result<ModelsResponse, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    response.json::<ModelsResponse>()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_response(
    request: GenerateRequest,
    chat_state: State<'_, ChatState>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Add user message to state
    {
        let mut messages = chat_state.0.lock().await;
        messages.push(Message {
            role: "user".to_string(),
            content: request.prompt.clone(),
        });
    }

    // Generate response
    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": request.model,
            "prompt": request.prompt,
            "stream": false,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let generate_response = response
        .json::<GenerateResponse>()
        .await
        .map_err(|e| e.to_string())?;

    // Add assistant response to state
    {
        let mut messages = chat_state.0.lock().await;
        messages.push(Message {
            role: "assistant".to_string(),
            content: generate_response.response.clone(),
        });
    }

    Ok(generate_response.response)
}

#[tauri::command]
async fn get_chat_history(chat_state: State<'_, ChatState>) -> Result<Vec<Message>, String> {
    let messages = chat_state.0.lock().await.clone();
    Ok(messages)
}

fn main() {
    tauri::Builder::default()
        .manage(ChatState::default())
        .invoke_handler(tauri::generate_handler![
            get_models,
            generate_response,
            get_chat_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}