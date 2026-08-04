# Agent Lee Local Network Discovery Contract

## Purpose

Define safe local-network discovery for Agent Lee.

## Discovery Scope

- Local IP and gateway.
- Subnet information.
- ARP table and neighbor cache.
- DNS hostnames where available.
- Reachable devices only when locally observable.
- Router or DHCP information only when accessible and authorized.

## Truth Rules

- Do not invent network devices.
- Do not infer ownership from an IP address alone.
- If discovery is partial, say so plainly.
- If discovery cannot run, report the blocker instead of guessing.

