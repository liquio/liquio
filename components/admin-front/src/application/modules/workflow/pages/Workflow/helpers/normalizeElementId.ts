export default (id: string): number => parseInt(id.split('-').pop() as string, 10);
