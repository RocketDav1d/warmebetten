"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type StepperContextValue = {
  value: number;
  setValue: (v: number) => void;
};

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepperContext() {
  const ctx = React.useContext(StepperContext);
  if (!ctx) throw new Error("Stepper components must be used within <Stepper />");
  return ctx;
}

type StepItemContextValue = {
  step: number;
  state: "completed" | "active" | "upcoming";
};

const StepItemContext = React.createContext<StepItemContextValue | null>(null);

function useStepItemContext() {
  const ctx = React.useContext(StepItemContext);
  if (!ctx)
    throw new Error("Stepper item components must be used within <StepperItem />");
  return ctx;
}

export function Stepper({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultValue: number;
  value?: number;
  onValueChange?: (v: number) => void;
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;

  const setValue = React.useCallback(
    (v: number) => {
      if (onValueChange) onValueChange(v);
      if (value === undefined) setInternal(v);
    },
    [onValueChange, value],
  );

  return (
    <StepperContext.Provider value={{ value: current, setValue }}>
      <div className={cn("space-y-6", className)} {...props}>
        {children}
      </div>
    </StepperContext.Provider>
  );
}

export function StepperNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-full items-center", className)} {...props} />
  );
}

export function StepperPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />;
}

export function StepperItem({
  step,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { step: number }) {
  const { value } = useStepperContext();
  const state: StepItemContextValue["state"] =
    step < value ? "completed" : step === value ? "active" : "upcoming";

  return (
    <StepItemContext.Provider value={{ step, state }}>
      <div
        className={cn("group/step", className)}
        data-state={state}
        {...props}
      >
        {children}
      </div>
    </StepItemContext.Provider>
  );
}

export function StepperTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setValue } = useStepperContext();
  const { step, state } = useStepItemContext();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        className,
      )}
      aria-current={state === "active" ? "step" : undefined}
      onClick={() => setValue(step)}
      {...props}
    />
  );
}

export function StepperIndicator({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const { state } = useStepItemContext();
  return (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
        state === "completed" && "bg-primary text-primary-foreground border-primary",
        state === "active" && "border-primary text-primary",
        state === "upcoming" && "border-muted-foreground/30 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function StepperSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "h-px flex-1 bg-muted-foreground/25 group-data-[state=completed]/step:bg-primary",
        className,
      )}
      {...props}
    />
  );
}

export function StepperContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: number }) {
  const { value: current } = useStepperContext();
  if (current !== value) return null;
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}


