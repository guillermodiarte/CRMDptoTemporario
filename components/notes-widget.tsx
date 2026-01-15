"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function NotesWidget() {
  const [personalContent, setPersonalContent] = useState("");
  const [globalContent, setGlobalContent] = useState("");
  // Separate status for each or global status? Let's use one status for simplicity or map
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");
  const [activeTab, setActiveTab] = useState("GLOBAL");

  useEffect(() => {
    setStatus("loading");
    Promise.all([
      fetch("/api/notes?type=PERSONAL").then(res => res.json()),
      fetch("/api/notes?type=GLOBAL").then(res => res.json())
    ]).then(([personal, global]) => {
      setPersonalContent(personal.content || "");
      setGlobalContent(global.content || "");
      setStatus("idle");
    }).catch(() => setStatus("error"));
  }, []);

  const saveNode = async (content: string, type: "PERSONAL" | "GLOBAL") => {
    setStatus("saving");
    try {
      await fetch("/api/notes", {
        method: "POST",
        body: JSON.stringify({ content, type }),
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const debouncedSavePersonal = useDebouncedCallback((value) => saveNode(value, "PERSONAL"), 1000);
  const debouncedSaveGlobal = useDebouncedCallback((value) => saveNode(value, "GLOBAL"), 1000);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, type: "PERSONAL" | "GLOBAL") => {
    const val = e.target.value;
    setStatus("saving");
    if (type === "PERSONAL") {
      setPersonalContent(val);
      debouncedSavePersonal(val);
    } else {
      setGlobalContent(val);
      debouncedSaveGlobal(val);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Notas Rápidas</CardTitle>
        <div className="h-4 w-4">
          {status === "saving" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === "saved" && <Check className="h-4 w-4 text-green-500" />}
          {status === "error" && <span className="text-xs text-red-500">Error</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 h-full flex flex-col">
        <Tabs defaultValue="GLOBAL" className="flex-1 flex flex-col h-full w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="GLOBAL">Globales</TabsTrigger>
            <TabsTrigger value="PERSONAL">Personales</TabsTrigger>
          </TabsList>
          <TabsContent value="GLOBAL" className="flex-1 mt-0 h-full">
            <Textarea
              placeholder="Notas globales (todos pueden ver y editar)..."
              className="h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 shadow-none p-2 text-sm bg-transparent"
              value={globalContent}
              onChange={(e) => handleChange(e, "GLOBAL")}
              disabled={status === "loading"}
            />
          </TabsContent>
          <TabsContent value="PERSONAL" className="flex-1 mt-0 h-full">
            <Textarea
              placeholder="Notas personales (solo tú puedes verlas)..."
              className="h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 shadow-none p-2 text-sm bg-transparent"
              value={personalContent}
              onChange={(e) => handleChange(e, "PERSONAL")}
              disabled={status === "loading"}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
