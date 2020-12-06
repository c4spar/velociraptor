import { readLines } from "../deps.ts";
import { Command } from "./command.ts";
import { log } from "./logger.ts";
import { EnvironmentVariables } from "./scripts_config.ts";

const envCache: Record<string, EnvironmentVariables> = {};

export async function getEnvVars(
  cmd: Command,
): Promise<EnvironmentVariables | undefined> {
  const envVars: EnvironmentVariables = {};
  if (cmd.env_file) {
    Object.assign(envVars, await parseEnvFile(cmd.env_file));
  }
  if (cmd.env && Object.entries(cmd.env).length > 0) {
    Object.assign(envVars, stringifyEnv(cmd.env));
  }
  if (Object.entries(envVars).length > 0) {
    return envVars;
  }
}

async function parseEnvFile(envFile: string): Promise<EnvironmentVariables> {
  if (envCache[envFile]) {
    return envCache[envFile];
  }
  try {
    const envVars: Record<string, string> = {};
    const fileReader = await Deno.open(envFile);
    for await (let line of readLines(fileReader)) {
      line = line.trim();
      if (!line || line[0] === "#") {
        continue;
      }
      const [name, value] = line
        .replace(/^export\s+/, "")
        .split("=", 2)
        .map((val: string) => val.trim());
      envVars[name] = stripeQuotes(value);
    }
    return envVars;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      log.error(`env_file not found: ${envFile}`);
    } else {
      log.error(`Failed to parse env_file: ${envFile}\n${error.stack}`);
    }
    throw error;
  }
}

function stripeQuotes(value: string) {
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' || first === "'") && first === last) {
    return value.slice(1, -1);
  }
  return value;
}

function stringifyEnv(env: EnvironmentVariables): EnvironmentVariables {
  for (let key in env) {
    if (key in env) {
      env[key] = String(env[key]);
    }
  }
  return env;
}
