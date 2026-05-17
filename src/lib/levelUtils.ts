export const calculateLevel = (points: number) => {
  if (points < 0) return 1;
  return Math.floor(Math.sqrt(points / 100)) + 1;
};

export const getPointsForLevel = (level: number) => {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
};

export const getLevelProgress = (points: number) => {
  const currentLevel = calculateLevel(points);
  const nextLevel = currentLevel + 1;
  const currentLevelPoints = getPointsForLevel(currentLevel);
  const nextLevelPoints = getPointsForLevel(nextLevel);
  
  const totalInLevel = nextLevelPoints - currentLevelPoints;
  const earnedInLevel = points - currentLevelPoints;
  
  return (earnedInLevel / totalInLevel) * 100;
};
