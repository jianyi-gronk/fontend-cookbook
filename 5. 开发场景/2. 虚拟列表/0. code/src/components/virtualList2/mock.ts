// 创建 10000 条数据
export const data = Array.from({ length: 100 }, (_, index) => ({
  id: index,
  first_name: `first_${index}`,
  last_name: `last_${index}`,
  height: index < 90 ? 10 : 90
}));
