#!/usr/bin/env python3
"""
Generate batch dark mode replacements for all remaining pages.
This script creates multi_replace_string_in_file compatible JSON for CSS class updates.
"""

# Color mapping for light mode (inverted from dark mode)
color_mappings = {
    # Background colors
    'bg-slate-800': 'bg-white',
    'bg-slate-900': 'bg-slate-50',
    'bg-slate-800/85': 'bg-white/90',
    'bg-slate-800/80': 'bg-white/85',
    'bg-slate-800/75': 'bg-white/80',
    'bg-slate-800/60': 'bg-white/70',
    'bg-slate-800/50': 'bg-white/60',
    'bg-slate-900/60': 'bg-slate-100/60',
    'bg-slate-900/50': 'bg-slate-100/50',
    'bg-slate-900/40': 'bg-slate-100/40',
    'bg-slate-900/35': 'bg-slate-100/35',
    
    # Border colors
    'border-slate-700': 'border-slate-200',
    'border-slate-700/80': 'border-slate-200/80',
    'border-slate-700/70': 'border-slate-200/70',
    
    # Text colors
    'text-slate-100': 'text-slate-900',
    'text-slate-200': 'text-slate-700',
    'text-slate-300': 'text-slate-600',
    'text-slate-400': 'text-slate-500',
    'text-slate-50': 'text-slate-900',
    
    # Placeholder colors
    'placeholder:text-slate-500': 'placeholder:text-slate-400',
    
    # Hover states
    'hover:bg-slate-700': 'hover:bg-slate-100',
    'hover:bg-slate-800': 'hover:bg-slate-50',
    'hover:text-slate-700': 'hover:text-slate-600',
    'hover:text-slate-300': 'hover:text-slate-400',
    
    # Ring colors
    'ring-slate-700': 'ring-slate-200',
    
    # Divide colors
    'divide-slate-700': 'divide-slate-200',
    'divide-slate-800': 'divide-slate-100',
}

def generate_dark_class_replacement(class_str):
    """Convert a dark-mode-only className to include light mode variant with dark: prefix."""
    dark_classes = []
    light_classes = []
    
    parts = class_str.split()
    
    for part in parts:
        if part in color_mappings:
            # This is a color that needs light mode version
            light_version = color_mappings[part]
            light_classes.append(light_version)
            dark_classes.append(f'dark:{part}')
        elif part.startswith('hover:') and part[6:] in color_mappings:
            # Hover state
            base = part[6:]
            light_hover = f'hover:{color_mappings[base]}'
            dark_hover = f'dark:{part}'
            light_classes.append(light_hover)
            dark_classes.append(dark_hover)
        elif part.startswith('placeholder:') and part[12:] in color_mappings:
            # Placeholder state
            base = part[12:]
            light_placeholder = f'placeholder:{color_mappings[base]}'
            dark_placeholder = f'dark:{part}'
            light_classes.append(light_placeholder)
            dark_classes.append(dark_placeholder)
        else:
            # Non-color class, include as-is
            light_classes.append(part)
            dark_classes.append(part)
    
    return ' '.join(light_classes + dark_classes)

# Test
sample_class = 'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring'
print("Sample transformation:")
print(f"Original: {sample_class}")
print(f"Updated:  {generate_dark_class_replacement(sample_class)}")
