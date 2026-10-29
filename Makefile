## Modular install of the mods, and the repo's checks.
##
##   make setup                         add this folder as a Claude Code marketplace
##   make install                       install every mod
##   make install <mod> [<mod>...]      install the mods you name, any number, any order
##   make <mod> [<mod>...]              the same, shorter (or: make install-<mod>)
##   make uninstall <mod> [<mod>...]    uninstall the mods you name (all without names)
##   make teardown                      uninstall every mod and remove the marketplace
##   make doctor                        check this machine: system, Claude Code, GPU, what to do next
##   make list                          mods, their description, installed or not
##   make dist                          zip each mod (committed state) into dist/plugins/, to upload to claude.ai
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
else ifneq ($(filter $(MODS),$(MAKECMDGOALS)),)
# `make sysmon usage-pace`: mod names alone install those mods, in one run.
MOD_GOALS := $(filter $(MODS),$(MAKECMDGOALS))
.PHONY: $(MOD_GOALS)
$(firstword $(MOD_GOALS)):
	@scripts/install.sh $(MOD_GOALS)
$(eval $(wordlist 2,$(words $(MOD_GOALS)),$(MOD_GOALS)):;@:)
endif

.DEFAULT_GOAL := help
.PHONY: help setup install uninstall teardown list doctor dist check fix $(addprefix install-,$(MODS)) $(addprefix uninstall-,$(MODS))

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

doctor:
	@scripts/doctor.sh

$(addprefix install-,$(MODS)): install-%:
	@scripts/install.sh $*

$(addprefix uninstall-,$(MODS)): uninstall-%:
	@scripts/install.sh --uninstall $*

# Built from the last commit (git archive): only tracked files, reproducible. Commit first.
dist:
	@mkdir -p dist/plugins
	@for m in $(MODS); do git archive --format=zip --prefix=$$m/ -o dist/plugins/$$m.zip HEAD:plugins/$$m && echo "dist/plugins/$$m.zip"; done
	@echo "Upload each zip on claude.ai: Customize > Plugins > Add > Upload plugin (same name = new version)."

check:
	@scripts/check.sh

fix:
	@scripts/check.sh --fix
