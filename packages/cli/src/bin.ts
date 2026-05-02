#!/usr/bin/env bun

import { dispatchCli } from "./cli-dispatch.ts";

process.exitCode = await dispatchCli(process.argv.slice(2));
