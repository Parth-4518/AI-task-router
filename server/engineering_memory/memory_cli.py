#!/usr/bin/env python3
"""CLI entry point for Engineering Memory System."""

import sys
import os

# Add the package directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from memory.cli import main

if __name__ == "__main__":
    main()
