// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
import { createContext } from "react"
import type { NezhaWebsocketResponse } from "../types/nezha-api"

export interface WebSocketContextType {
  lastData: NezhaWebsocketResponse | null
  lastMessage: { data: string } | null
  connected: boolean
  messageHistory: { data: string }[]
  reconnect: () => void
  needReconnect: boolean
  setNeedReconnect: (needReconnect: boolean) => void
}

export const WebSocketContext = createContext<WebSocketContextType>({
  lastData: null,
  lastMessage: null,
  connected: false,
  messageHistory: [],
  reconnect: () => {},
  needReconnect: false,
  setNeedReconnect: () => {},
})
