"use client"

import { createContext, useContext } from "react"

export interface RouterContextType {
  currentPage: string
  navigate: (page: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const RouterContext = createContext<RouterContextType>({
  currentPage: "/dashboard",
  navigate: () => {},
  sidebarCollapsed: true,
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
})

export function useRouter() {
  return useContext(RouterContext)
}
