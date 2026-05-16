export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  order: number;
}
