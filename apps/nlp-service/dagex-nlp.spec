# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs
from PyInstaller.utils.hooks import copy_metadata

datas = []
datas += collect_data_files('spacy')
datas += collect_data_files('en_core_web_lg')
datas += collect_data_files('fr_core_news_lg')
datas += collect_data_files('ru_core_news_lg')
datas += copy_metadata('spacy')
datas += copy_metadata('en_core_web_lg')
datas += copy_metadata('fr_core_news_lg')
datas += copy_metadata('ru_core_news_lg')
# KuzuDB ships precompiled native libraries — collect them explicitly
datas += collect_data_files('kuzu')
binaries_extra = collect_dynamic_libs('kuzu')


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries_extra,
    datas=datas,
    hiddenimports=['kuzu'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tensorflow', 'tensorboard'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='dagex-nlp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='dagex-nlp',
)
