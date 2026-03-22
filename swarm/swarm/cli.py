from __future__ import annotations

import argparse
import json
from pathlib import Path

from .claude_plugin import materialize_claude_plugin
from .commands import COMMAND_SPECS, get_command
from .consensus import probe_agents
from .codex_skills import materialize_codex_skills
from .inventory import inventory_local_sources
from .manifests import (
    build_codex_package_manifest,
    build_command_manifest,
    build_consensus_manifest,
    build_local_sources_manifest,
    build_route_manifest,
)
from .project_skills import materialize_project_skills


def _json_dump(data: object) -> str:
    return json.dumps(data, indent=2) + "\n"


def _print_commands() -> None:
    for command in COMMAND_SPECS:
        print(f"{command.name:16} {command.summary}")


def _print_command(name: str) -> None:
    command = get_command(name)
    print(_json_dump(command.to_dict()), end="")


def _print_consensus(as_json: bool) -> None:
    agents = [probe.to_dict() for probe in probe_agents()]
    if as_json:
        print(_json_dump({"agents": agents}), end="")
        return

    for agent in agents:
        status = "available" if agent["available"] else "missing"
        print(f"{agent['label']:14} {status:9} {agent['executable']}")


def _write_manifest(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "commands.generated.json": build_command_manifest(),
        "routes.generated.json": build_route_manifest(),
        "codex-package.json": build_codex_package_manifest(),
        "consensus.generated.json": build_consensus_manifest(),
        "local-sources.generated.json": build_local_sources_manifest(),
    }
    for filename, payload in files.items():
        (output_dir / filename).write_text(_json_dump(payload), encoding="utf-8")
        print(f"wrote {output_dir / filename}")
    for path in materialize_claude_plugin(output_dir):
        print(f"wrote {path}")
    for path in materialize_project_skills(output_dir):
        print(f"wrote {path}")
    for path in materialize_codex_skills(output_dir):
        print(f"wrote {path}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="swarm")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    subparsers.add_parser("commands", help="List public commands")

    show = subparsers.add_parser("show", help="Show a single command spec")
    show.add_argument("name", help="Command name, with or without leading slash")

    consensus = subparsers.add_parser("consensus", help="Probe installed external agent CLIs")
    consensus.add_argument("--json", action="store_true", help="Emit JSON")

    inventory = subparsers.add_parser(
        "inventory-local",
        help="Inventory local bootstrap sources such as ~/shared, ~/SNIPPETS, and ~/packages",
    )
    inventory.add_argument("--json", action="store_true", help="Emit JSON")

    manifests = subparsers.add_parser("build-manifests", help="Generate Swarm manifest files")
    manifests.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parents[1]),
        help="Directory where manifest files should be written",
    )

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.subcommand == "commands":
        _print_commands()
        return
    if args.subcommand == "show":
        _print_command(args.name)
        return
    if args.subcommand == "consensus":
        _print_consensus(args.json)
        return
    if args.subcommand == "inventory-local":
        payload = {"sources": inventory_local_sources()}
        if args.json:
            print(_json_dump(payload), end="")
        else:
            for key, source in payload["sources"].items():
                status = "present" if source["exists"] else "missing"
                print(f"{key:10} {status:7} {source['root']}")
        return
    if args.subcommand == "build-manifests":
        _write_manifest(Path(args.output_dir))
        return

    parser.error("Unknown subcommand")


if __name__ == "__main__":
    main()
