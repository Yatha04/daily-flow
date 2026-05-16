export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TabId = "todos" | "notes";

export interface Settings {
  activeTab?: TabId;
  lastSeenDate?: string;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  order: number;
}
