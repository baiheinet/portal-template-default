import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getRouteSurfacePrompt,
  routeSurfaceScenarios,
  type RouteSurfaceScenarioId,
} from "./scenarios";

export function RouteSurfacePromptGenerator() {
  const [scenarioId, setScenarioId] =
    useState<RouteSurfaceScenarioId>("drawer");
  const [target, setTarget] = useState("a customer detail workflow");
  const [copied, setCopied] = useState(false);
  const scenario =
    routeSurfaceScenarios.find((item) => item.id === scenarioId) ??
    routeSurfaceScenarios[0];
  const prompt = useMemo(
    () => getRouteSurfacePrompt(scenario, target),
    [scenario, target]
  );

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt generator</CardTitle>
        <CardDescription>
          Generate a complete routing scenario, not just an isolated overlay component.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="route-surface-scenario">Scenario</Label>
            <Select
              value={scenarioId}
              onValueChange={(value) =>
                setScenarioId(value as RouteSurfaceScenarioId)
              }
            >
              <SelectTrigger id="route-surface-scenario" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {routeSurfaceScenarios.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.number}. {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="route-surface-target">Business target</Label>
            <Input
              id="route-surface-target"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
        </div>
        <Textarea value={prompt} readOnly className="min-h-80 font-mono text-xs" />
        <div className="flex justify-end">
          <Button type="button" onClick={() => void copyPrompt()}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
