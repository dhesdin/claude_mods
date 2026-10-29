## Modular install of the mods, and the repo's checks.
##
##   make setup                         add this folder as a Claude Code marketplace
##   make install                       install every mod
##   make install sysmon teacher-guard  install some mods (or: make install-sysmon)
##   make uninstall sysmon              uninstall some mods (all without names)
##   make teardown                      uninstall every mod and remove the marketplace
##   make list                          mods, their description, installed or not
##   make check | make fix              every CI check | format and safe lint fixes
##
## Variables, from the command line (make install MOD_LANG=fr), the environment,
## or a git-ignored config.mk (copy config.mk.example):
##   MOD_LANG   display language: en, fr, ja, zh (default: each mod's default, en)
##   MOD_SCOPE  where Claude Code records the install: user, project, local (default user)
##   CLAUDE     the Claude Code binary (default claude; CLAUDE=echo prints instead of running)

-include config.mk

MOD_LANG ?=
MOD_SCOPE ?= user
CLAUDE ?= claude
export MOD_LANG MOD_SCOPE CLAUDE

MODS := $(notdir $(wildcard plugins/*))
# `make install a b`: the words after install/uninstall are its arguments (checked by
# scripts/install.sh, so an unknown name fails), not targets of their own.
ifneq ($(filter $(firstword $(MAKECMDGOALS)),install uninstall),)
ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(ARGS):;@:)
endif

.DEFAULT_GOAL := help
.PHONY: help setup install uninstall teardown list check fix $(addprefix install-,$(MODS)) $(addprefix uninstall-,$(MODS))

help:
	@sed -n 's/^## \{0,1\}//p' $(firstword $(MAKEFILE_LIST))
	@echo
	@echo "Mods: $(MODS)"

setup:
	@scripts/install.sh --setup

install:
	@scripts/install.sh $(ARGS)

uninstall:
	@scripts/install.sh --uninstall $(ARGS)

teardown:
	@scripts/install.sh --teardown

list:
	@scripts/install.sh --list

$(addprefix install-,$(MODS)): install-%:
	@scripts/install.sh $*

$(addprefix uninstall-,$(MODS)): uninstall-%:
	@scripts/install.sh --uninstall $*

check:
	@scripts/check.sh

fix:
	@scripts/check.sh --fix
