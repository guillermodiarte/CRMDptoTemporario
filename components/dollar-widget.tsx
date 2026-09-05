import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface DollarItem {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface DollarWidgetProps {
  data: DollarItem[] | null;
}

export function DollarWidget({ data }: DollarWidgetProps) {
  if (!data || !Array.isArray(data)) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cotización Dólar</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No disponible</div>
        </CardContent>
      </Card>
    );
  }

  // Find specific rates
  const oficial = data.find(item => item.casa === 'oficial');
  const blue = data.find(item => item.casa === 'blue');

  const promOficial = oficial ? (oficial.compra + oficial.venta) / 2 : null;
  const promBlue = blue ? (blue.compra + blue.venta) / 2 : null;

  const formatPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return (val % 1 === 0 ? val.toString() : val.toFixed(1)).replace('.', ',');
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cotización Dólar</CardTitle>
        <DollarSign className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center items-center">
          {/* Headers */}
          <div className="text-left"></div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase">Compra</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase">Venta</div>

          {/* Oficial */}
          <div className="text-left">
            <div className="text-sm font-medium">Oficial</div>
            <div className="text-[10px] text-muted-foreground">BNA</div>
          </div>
          <div className="font-bold text-sm">${oficial?.compra ?? "-"}</div>
          <div className="font-bold text-sm">${oficial?.venta ?? "-"}</div>

          <div className="col-span-3 h-px bg-muted my-1" />

          {/* Blue */}
          <div className="text-left">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Blue</div>
            <div className="text-[10px] text-muted-foreground">Informal</div>
          </div>
          <div className="font-bold text-sm text-blue-700 dark:text-blue-300">${blue?.compra ?? "-"}</div>
          <div className="font-bold text-sm text-blue-700 dark:text-blue-300">${blue?.venta ?? "-"}</div>

          <div className="col-span-3 h-px bg-muted my-1" />

          {/* Promedio Oficial */}
          <div className="text-left">
            <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Prom. Oficial</div>
            <div className="text-[10px] text-muted-foreground">Compra / Venta</div>
          </div>
          <div className="col-span-2 text-center font-bold text-sm text-purple-700 dark:text-purple-300">
            ${formatPrice(promOficial)}
          </div>

          <div className="col-span-3 h-px bg-muted my-1" />

          {/* Promedio Blue */}
          <div className="text-left">
            <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Prom. Blue</div>
            <div className="text-[10px] text-muted-foreground">Compra / Venta</div>
          </div>
          <div className="col-span-2 text-center font-bold text-sm text-purple-700 dark:text-purple-300">
            ${formatPrice(promBlue)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
