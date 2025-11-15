import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  title?: string;
  description?: string;
}

export const FunnelChart = ({ stages, title = "Funil de Conversão", description }: FunnelChartProps) => {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const widthPercent = (stage.count / maxCount) * 100;
            const conversionRate = index > 0 
              ? ((stage.count / stages[index - 1].count) * 100).toFixed(1)
              : null;

            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{stage.count}</span>
                    {conversionRate && (
                      <span className="text-xs text-muted-foreground">
                        ({conversionRate}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center justify-center"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color,
                    }}
                  >
                    {stage.count > 0 && (
                      <span className="text-xs font-medium text-white mix-blend-difference px-2">
                        {stage.count} cards
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
