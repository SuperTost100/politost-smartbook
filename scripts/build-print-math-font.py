r"""Builds src/print/fastPrint/fonts/STIXTwoMath-print.woff2, the font of fast print (docs/Print.md).

Usage: uv run --with fonttools --with brotli python scripts/build-print-math-font.py STIXTwoMath-Regular.otf

The source is STIX Two Math 2.12 (https://github.com/stipub/stixfonts, SIL OFL 1.1). The script
1. fixes the assembly of the right arrow: its head part declares no connector at its start, so
   Chromium cannot join it to the extender and draws `\xrightarrow`, `\xleftrightarrow`,
   `\overrightarrow` and `\xmapsto` at their natural width. The head gets the 200 units the left
   arrow's head has at its end;
2. lowers the label over such an arrow: STIX Two Math raises its baseline 0.8em, so an inline
   `\xrightarrow{\Delta}` pushed its line away from the one above. Latin Modern Math's 0.111em
   lets the label sit just above the arrow, as in KaTeX;
3. keeps the characters TeX math writes (Latin, Greek, punctuation, letterlike symbols, arrows,
   operators, technical and geometric symbols, the bracket and arrow supplements, and the math
   alphanumeric styles Temml writes for \mathbf, \mathit, \boldsymbol, \mathcal, \mathfrak,
   \mathbb, \mathsf and \mathtt), with every size variant and assembly part the MATH table gives
   them, and the OpenType features the browser and Temml's CSS use.
"""
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

UNICODES = (
    'U+0020-007E,U+00A0-017F,U+0237,U+02B0-02FF,U+0300-036F,U+0391-03F6,U+2000-209F,U+20D0-20FF,'
    'U+2100-214F,U+2190-23FF,U+25A0-25FF,U+27C0-27FF,U+2900-2AFF,'
    'U+1D400-1D4CF,U+1D504-1D56B,U+1D5A0-1D5D3,U+1D670-1D755,U+1D7CE-1D7FF'
)
FEATURES = ['ssty', 'flac', 'dtls', 'ss01', 'ss04', 'ccmp', 'kern', 'mark', 'mkmk']
OUT = 'src/print/fastPrint/fonts/STIXTwoMath-print.woff2'
# Latin Modern Math's StretchStackTopShiftUp, in place of STIX Two Math's 800.
STRETCH_STACK_TOP_SHIFT = 111


def fix_right_arrow(font: TTFont) -> None:
    for construction in font['MATH'].table.MathVariants.HorizGlyphConstruction:
        assembly = construction.GlyphAssembly
        if not assembly:
            continue
        for part in assembly.PartRecords:
            if part.glyph == 'uni2192.var' and part.StartConnectorLength == 0:
                part.StartConnectorLength = 200


def lower_stretch_stack(font: TTFont) -> None:
    constants = font['MATH'].table.MathConstants
    constants.StretchStackTopShiftUp.Value = STRETCH_STACK_TOP_SHIFT


def main(source: str) -> None:
    font = TTFont(source)
    fix_right_arrow(font)
    lower_stretch_stack(font)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = FEATURES
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    options.hinting = False
    options.drop_tables += ['DSIG']
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(OUT)
    print(f'{OUT}: {len(font.getGlyphOrder())} glyphs')


if __name__ == '__main__':
    main(sys.argv[1])
