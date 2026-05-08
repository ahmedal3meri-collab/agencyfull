#!/usr/bin/env python3
"""
Agency Agents Runner
Runs any agent from the /agents directory using OpenRouter (free) or OpenAI.

Usage:
    python run_agent.py                    # interactive agent picker
    python run_agent.py --agent engineering/engineering-senior-developer
    python run_agent.py --list             # list all available agents
    python run_agent.py --provider openai  # override provider
"""

import os
import sys
import argparse
import glob
import re
from pathlib import Path
from typing import Optional

try:
    import yaml
except ImportError:
    yaml = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from openai import OpenAI
except ImportError:
    print("ERROR: openai package not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich import print as rprint
    console = Console()
    RICH = True
except ImportError:
    RICH = False
    console = None

AGENTS_DIR = Path(__file__).parent / "agents"

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENAI_BASE_URL = "https://api.openai.com/v1"

FREE_MODELS = [
    "mistralai/mistral-7b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-3-1b-it:free",
    "qwen/qwen-2.5-7b-instruct:free",
]


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Extract YAML frontmatter and body from a markdown file."""
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            raw = content[3:end].strip()
            body = content[end + 3:].strip()
            if yaml:
                try:
                    meta = yaml.safe_load(raw)
                    return meta or {}, body
                except Exception:
                    pass
            # Fallback: simple key: value parser
            meta = {}
            for line in raw.splitlines():
                if ":" in line:
                    k, _, v = line.partition(":")
                    meta[k.strip()] = v.strip()
            return meta, body
    return {}, content


def find_agents() -> list[dict]:
    """Return sorted list of all agent dicts with path, name, description, category."""
    agents = []
    for md_file in sorted(AGENTS_DIR.rglob("*.md")):
        rel = md_file.relative_to(AGENTS_DIR)
        category = rel.parts[0] if len(rel.parts) > 1 else "misc"
        content = md_file.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(content)
        name = meta.get("name") or md_file.stem.replace("-", " ").title()
        description = meta.get("description") or meta.get("vibe") or ""
        agents.append(
            {
                "path": str(rel.with_suffix("")),
                "file": md_file,
                "category": category,
                "name": name,
                "description": description,
                "meta": meta,
                "body": body,
                "system_prompt": content,
            }
        )
    return agents


def list_agents(agents: list[dict]) -> None:
    if RICH:
        table = Table(title="Agency Agents", show_lines=True)
        table.add_column("#", style="dim", width=4)
        table.add_column("Category", style="cyan", width=20)
        table.add_column("Name", style="bold green")
        table.add_column("Description", style="white")
        for i, a in enumerate(agents, 1):
            emoji = a["meta"].get("emoji", "")
            table.add_row(
                str(i),
                a["category"],
                f"{emoji} {a['name']}".strip(),
                a["description"][:80] + ("…" if len(a["description"]) > 80 else ""),
            )
        console.print(table)
    else:
        for i, a in enumerate(agents, 1):
            print(f"{i:3}. [{a['category']}] {a['name']}")
            if a["description"]:
                print(f"       {a['description'][:80]}")


def pick_agent(agents: list[dict]) -> Optional[dict]:
    list_agents(agents)
    print()
    try:
        choice = input("Enter agent number (or partial name to search): ").strip()
    except (EOFError, KeyboardInterrupt):
        return None

    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(agents):
            return agents[idx]
        print("Invalid number.")
        return None

    # Search by name or path
    needle = choice.lower()
    matches = [a for a in agents if needle in a["name"].lower() or needle in a["path"].lower()]
    if not matches:
        print(f"No agent matching '{choice}'.")
        return None
    if len(matches) == 1:
        return matches[0]
    print(f"Multiple matches ({len(matches)}):")
    for i, a in enumerate(matches, 1):
        print(f"  {i}. {a['name']} ({a['path']})")
    try:
        sub = input("Pick number: ").strip()
        idx = int(sub) - 1
        if 0 <= idx < len(matches):
            return matches[idx]
    except (ValueError, EOFError, KeyboardInterrupt):
        pass
    return None


def build_client(provider: str) -> tuple[OpenAI, str]:
    """Return (OpenAI client, model_name) for the chosen provider."""
    if provider == "openrouter":
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not api_key:
            print("ERROR: OPENROUTER_API_KEY not set. Copy .env.example to .env and fill it in.")
            sys.exit(1)
        model = os.getenv("OPENROUTER_MODEL", FREE_MODELS[0])
        client = OpenAI(
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
        )
        return client, model

    elif provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            print("ERROR: OPENAI_API_KEY not set. Copy .env.example to .env and fill it in.")
            sys.exit(1)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)
        return client, model

    else:
        print(f"ERROR: Unknown provider '{provider}'. Use 'openrouter' or 'openai'.")
        sys.exit(1)


def chat_loop(agent: dict, client: OpenAI, model: str, provider: str) -> None:
    system_prompt = agent["system_prompt"]
    history = [{"role": "system", "content": system_prompt}]

    emoji = agent["meta"].get("emoji", "")
    header = f"{emoji} {agent['name']}".strip()

    if RICH:
        console.print(
            Panel(
                f"[bold]{header}[/bold]\n[dim]{agent['description']}[/dim]\n\n"
                f"[cyan]Provider:[/cyan] {provider}  |  [cyan]Model:[/cyan] {model}\n\n"
                "[dim]Type your message, 'quit' or Ctrl+C to exit[/dim]",
                border_style="green",
            )
        )
    else:
        print(f"\n{'='*60}")
        print(f"  Agent : {header}")
        print(f"  Model : {model} ({provider})")
        print("  Type 'quit' or press Ctrl+C to exit")
        print(f"{'='*60}\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        history.append({"role": "user", "content": user_input})

        try:
            response = client.chat.completions.create(
                model=model,
                messages=history,
            )
            reply = response.choices[0].message.content or ""
            history.append({"role": "assistant", "content": reply})

            if RICH:
                console.print(f"\n[bold green]{header}:[/bold green] {reply}\n")
            else:
                print(f"\n{header}: {reply}\n")

        except Exception as e:
            print(f"\nERROR: {e}\n")
            if "401" in str(e):
                print("Check your API key in the .env file.")
            elif "model" in str(e).lower():
                print(f"Try a different model. Available free models on OpenRouter:")
                for m in FREE_MODELS:
                    print(f"  - {m}")
            break


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Agency Agents with OpenRouter (free) or OpenAI"
    )
    parser.add_argument(
        "--agent",
        "-a",
        help="Agent path relative to agents/ (e.g. engineering/engineering-senior-developer)",
    )
    parser.add_argument(
        "--list",
        "-l",
        action="store_true",
        help="List all available agents and exit",
    )
    parser.add_argument(
        "--provider",
        "-p",
        choices=["openrouter", "openai"],
        default=os.getenv("PROVIDER", "openrouter"),
        help="LLM provider to use (default: openrouter)",
    )
    parser.add_argument(
        "--model",
        "-m",
        help="Override the model name",
    )
    parser.add_argument(
        "--free-models",
        action="store_true",
        help="List available free OpenRouter models and exit",
    )
    args = parser.parse_args()

    if args.free_models:
        print("Free models on OpenRouter:")
        for m in FREE_MODELS:
            print(f"  {m}")
        return

    agents = find_agents()
    if not agents:
        print(f"No agents found in {AGENTS_DIR}")
        sys.exit(1)

    if args.list:
        list_agents(agents)
        return

    # Resolve agent
    agent = None
    if args.agent:
        needle = args.agent.lower().rstrip(".md")
        for a in agents:
            if needle in a["path"].lower():
                agent = a
                break
        if not agent:
            print(f"Agent not found: {args.agent}")
            list_agents(agents)
            sys.exit(1)
    else:
        agent = pick_agent(agents)
        if not agent:
            sys.exit(0)

    # Build client
    client, model = build_client(args.provider)
    if args.model:
        model = args.model

    chat_loop(agent, client, model, args.provider)


if __name__ == "__main__":
    main()
