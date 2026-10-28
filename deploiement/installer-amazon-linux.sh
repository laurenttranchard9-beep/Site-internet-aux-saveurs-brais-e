#!/bin/bash
# Ancien nom de l'installateur, gardé pour que les commandes déjà notées fonctionnent toujours.
# Le script complet, pour Ubuntu, Debian et Amazon Linux 2023, est installer.sh.
set -euo pipefail
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/installer.sh | bash -s -- "$@"
