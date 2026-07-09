import { z } from "zod";

export const stopReasonSchema = z.enum(["final_answer", "invalid_tool_call", "model_no_final"]);

export const toolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()),
});

export const toolResultSchema = z.object({
  toolCallId: z.string().min(1),
  output: z.string(),
  ok: z.boolean(),
  errorMessage: z.string().optional(),
});

export const agentMessageSchema = z.discriminatedUnion("kind", [
  z.object({
    role: z.enum(["user", "assistant", "tool"]),
    kind: z.literal("text"),
    content: z.string(),
    toolCall: toolCallSchema.optional(),
    toolResult: toolResultSchema.optional(),
  }),
  z.object({
    role: z.literal("assistant"),
    kind: z.literal("tool_call"),
    content: z.string(),
    toolCall: toolCallSchema,
  }),
  z.object({
    role: z.literal("tool"),
    kind: z.literal("tool_result"),
    content: z.string(),
    toolResult: toolResultSchema,
  }),
]);

export const agentEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_start"),
    task: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("assistant_message"),
    step: z.number().int().nonnegative(),
    message: agentMessageSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("tool_result"),
    step: z.number().int().nonnegative(),
    toolResult: toolResultSchema,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("run_end"),
    stopReason: stopReasonSchema,
    finalAnswer: z.string().nullable(),
    timestamp: z.number(),
  }),
]);

export const agentRunRequestSchema = z.object({
  task: z.string().min(1),
  maxSteps: z.number().int().positive().optional(),
});

export const agentRunResponseSchema = z.object({
  finalAnswer: z.string().nullable(),
  stopReason: stopReasonSchema,
  messages: z.array(agentMessageSchema),
  events: z.array(agentEventSchema).optional(),
});

export type AgentRunRequest = z.infer<typeof agentRunRequestSchema>;
export type AgentRunResponse = z.infer<typeof agentRunResponseSchema>;
export type AgentEventPayload = z.infer<typeof agentEventSchema>;