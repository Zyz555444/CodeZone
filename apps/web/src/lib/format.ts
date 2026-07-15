// CodeZone · 格式化工具
const now = Date.now();
const min = 60_000;
const hour = 3_600_000;
const day = 86_400_000;

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < min) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs ? `${m}m${rs}s` : `${m}m`;
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 生成头像首字 (基于姓名)
export function avatarInitial(name: string): string {
  return name.charAt(0);
}

// 基于姓名生成稳定的色相
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [14, 28, 42, 168, 184, 200, 260, 320];
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 45%, 58%)`;
}
