// src/App.tsx
'use client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { invoke } from '@tauri-apps/api/tauri'
import { AlertCircle, Loader2, Send } from 'lucide-react'

import { useEffect, useState } from "react"

interface Message {
  role: string
  content: string
}

interface ModelInfo {
  name: string
  modified_at: string
  size: number
  digest: string
}

// const isTauriAvailable = () => {
//   return Boolean(window && window.__TAURI_IPC__);
// }


export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function loadModels() {
    try {
      const response = await invoke<{ models: ModelInfo[] }>("get_models")
      setModels(response.models)
      if (response.models.length > 0) {
        setSelectedModel(response.models[0].name)
      }
    } catch  {
      setError("Failed to load models")
    }
  }


  useEffect(() => {
    loadModels()
    loadChatHistory()
  }, [])


  async function loadChatHistory() {
    const history = await invoke<Message[]>("get_chat_history")
    setMessages(history)
  }

  async function handleSubmit() {
    if (!input.trim() || !selectedModel) return

    setLoading(true)
    setError("")

    try {
      await invoke<string>("generate_response", {
        request: {
          model: selectedModel,
          prompt: input,
        },
      })
      setInput("")
      await loadChatHistory()
    } catch {
      setError("Failed to generate response")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white  rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ollama Chat</h1>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.digest} value={model.name}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="h-[500px] overflow-y-auto border rounded-lg p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 ml-auto max-w-[80%]'
                  : 'bg-gray-100 mr-auto max-w-[80%]'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>

        <form className="flex gap-4"onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
            className="flex-1 min-h-[80px] p-2"
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedModel || !input.trim()}
            className="px-6"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span className="mr-2">Send</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}