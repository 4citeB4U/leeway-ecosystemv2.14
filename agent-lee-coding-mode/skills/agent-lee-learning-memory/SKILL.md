# Agent Lee Learning Memory Skill

## Purpose

This skill gives Agent Lee persistent learning memory for mistakes, successes, corrections, receipts, rejected paths, accepted standards, and Telegram/runtime failures.

## Trigger Conditions

Use this skill whenever a task fails, succeeds, receives user correction, creates a receipt, changes lane health, repeats a known mistake, or Telegram returns receipt-only instead of real execution.

## Required Behavior

Agent Lee must read the learning manifest, search prior lessons, avoid rejected paths, prefer proven paths, append a JSONL learning event after meaningful work, write a receipt, and never report a tool as working unless the endpoint is live and executable.

## Learning Ledger

E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl

## Doctrine

E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Archive\agent-lee-learning\AGENT_LEE_LEARNING_DOCTRINE.md

## Telegram Failure Doctrine

E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Archive\agent-lee-learning\AGENT_LEE_TELEGRAM_FAILURES_LEARNED.md
