{
  description = "Syntax highlighting for keiro-dsl (.keiro) in Vim/Neovim and Shiki";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  # Dev-shell only. This flake exists so the `sync-keiro-dsl` mori reaction has
  # a devShell to run under -- every mori RunCommand action is executed as
  # `nix develop --command <cmd>` in the target repo root, so the binaries the
  # reaction invokes must be on this shell's PATH.
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = [
            pkgs.bun # shiki-keiro test runner
            pkgs.neovim # keiro-vim headless highlight tests
            pkgs.just # task runner (reaction entrypoint)
            pkgs.git
            pkgs.jq # parses `mori registry show --json`
          ];
        };
      });
}
