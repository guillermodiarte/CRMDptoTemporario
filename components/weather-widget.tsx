import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Sun, CloudRain, Wind, CloudLightning, Snowflake } from "lucide-react";

interface WeatherWidgetProps {
  data: any;
}

// Map icon number to Lucide icon
// Meteosource icon_num: 
// 1-6: clear/partly cloudy -> Sun/Cloud
// 7-8: overcast -> Cloud
// 9-13: rain -> CloudRain
// 14-15: thunderstorm -> CloudLightning
// 16-25: snow/mix -> Snowflake
// 26-..: rain -> CloudRain
function getWeatherIcon(iconNum: number) {
  if (iconNum <= 6) return <Sun className="h-8 w-8 text-yellow-500" />;
  if (iconNum <= 8) return <Cloud className="h-8 w-8 text-gray-500 dark:text-slate-300" />;
  if (iconNum <= 13) return <CloudRain className="h-8 w-8 text-blue-500 dark:text-blue-400" />;
  if (iconNum <= 15) return <CloudLightning className="h-8 w-8 text-purple-500 dark:text-purple-400" />;
  if (iconNum <= 25) return <Snowflake className="h-8 w-8 text-cyan-500 dark:text-cyan-400" />;
  return <CloudRain className="h-8 w-8 text-blue-500 dark:text-blue-400" />;
}

export function WeatherWidget({ data }: WeatherWidgetProps) {
  if (!data || !data.current) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clima (Formosa)</CardTitle>
          <Sun className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No disponible</div>
        </CardContent>
      </Card>
    )
  }

  const { current } = data;
  const icon = getWeatherIcon(current.icon_num);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 dark:from-slate-900 dark:to-blue-950/40 dark:border-slate-800 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">Clima en Formosa</CardTitle>
        <Wind className="h-4 w-4 text-blue-400 dark:text-blue-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-4xl font-bold text-blue-900 dark:text-white">{Math.round(current.temperature)}°C</span>
            <span className="text-sm text-blue-600 dark:text-blue-400 capitalize">{current.summary}</span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm dark:shadow-slate-950/50 border border-transparent dark:border-slate-700/60">
            {icon}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-blue-700 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Wind className="h-3 w-3 text-blue-500 dark:text-blue-400" />
            <span>{current.wind?.speed} km/h</span>
          </div>
          <div className="flex items-center gap-1">
            <CloudRain className="h-3 w-3 text-blue-500 dark:text-blue-400" />
            <span>{current.precipitation?.total} mm</span>
          </div>
        </div>

        {/* Forecast Section */}
        {data.daily && data.daily.data && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-slate-800">
            <p className="text-xs font-medium text-blue-900 dark:text-slate-300 mb-2">Próximos Días</p>
            <div className="grid grid-cols-3 gap-2">
              {data.daily.data.slice(1, 4).map((day: any, i: number) => (
                <div key={i} className="flex flex-col items-center bg-white/50 dark:bg-slate-800/60 border border-transparent dark:border-slate-700/40 rounded p-2 text-center">
                  <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                    {new Date(day.day).toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()}
                  </span>
                  <div className="scale-75 -my-1">
                    {getWeatherIcon(day.icon)}
                  </div>
                  <div className="text-xs font-bold text-blue-900 dark:text-slate-100">
                    {Math.round(day.all_day.temperature)}°
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
