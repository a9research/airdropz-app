export interface Account {
  id: string;
  name: string;
  browser_id: string;
  token: string;
  proxy: string;
  uid: string;
  username: string;
  password: string;
  group_name: string;
  created_at: string;
  updated_at: string;
  group_color: string;
  group_description: string;
}

export interface Group {
  name: string;
  description: string;
  color: string;
  created_at: string;
  account_count: number;
}

export interface AccountTableData {
  accounts: Account[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
  accounts?: any[];
}

// Tickets相关类型
export interface Ticket {
  cdkey: string;
  gift: number;
  buyer_userid: string;
  buyer_username: string;
}

export interface TicketAccount {
  id: string;
  name: string;
  uid: string;
  username: string;
  password: string;
  tickets: Ticket[];
  tickets_count: number;
  created_at: string;
  updated_at: string;
  token?: string;
  last_query_time?: string;
  proxy?: string;
}

// 决策相关类型
export interface Decision {
  id: string;
  option: string;
  created_at: string;
}

export interface DecisionAccount {
  id: string;
  name: string;
  uid: string;
  current_decision: string;
  status: 'submitted' | 'not_submitted' | 'waiting_query' | 'waiting_retry';
  history_decisions: Decision[];
  created_at: string;
  updated_at: string;
  token?: string;
  proxy?: string;
}

// 训练相关类型
export interface Training {
  id: string;
  type: string;
  sequence_status: 'waiting' | 'running' | 'completed';
  daily_reward: number;
  training_reward: number;
  created_at: string;
}

export interface TrainingAccount {
  id: string;
  name: string;
  uid: string;
  username: string;
  password: string;
  token: string;
  proxy: string;
  training_content: 'Positive' | 'Neutral' | 'Negative';
  training_status: '未训练' | '训练中' | '训练成功' | '训练失败';
  daily_reward_status: '已领取' | '未领取';
  training_reward_status: '已领取' | '未领取';
  advanced_training_status: '未训练' | '训练中' | '训练成功' | '训练失败';
  created_at: string;
  updated_at: string;
}

// 挖矿相关类型
export interface MiningData {
  today_points: number;
  total_points: number;
  soul: number;
  core: number;
  total_soul: number;
  total_core: number;
  era_gaea: number;
  today_gaea: number;
  today_uptime: number;
  online: boolean;
  last_ping: string;
}

export interface MiningAccount {
  id: string;
  name: string;
  uid: string;
  browser_id: string;
  token: string;
  proxy: string;
  status: 'running' | 'stopped' | 'error';
  last_ping: string | null;
  last_info: MiningData | null;
  error_count: number;
  created_at: string;
  updated_at: string;
}
