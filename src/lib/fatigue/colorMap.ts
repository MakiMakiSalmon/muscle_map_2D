export function getFatigueColor(value: number): string {
  if (value === 0)  return '#dddddd';
  if (value < 30)   return '#90ee90';
  if (value < 60)   return '#ffd700';
  if (value < 80)   return '#ff8c00';
  return                   '#ff4500';
}
