export interface NutritionResult {
  detectedItems: string[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  estimatedWeight?: string;
}

export interface BiomechanicsResult {
  exercise: string;
  repsCounted: number;
  averageAngle: number;
  formErrors: string[];
  totalFramesAnalyzed?: number;
}