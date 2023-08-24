// https://deno.land/typedoc/
// https://github.com/denoland/deno_std/blob/master/fs/README.md

import { bgBlue, red, bold, italic } from "https://deno.land/std/fmt/colors.ts";

console.log(bgBlue(italic(red(bold("Hello world!")))));
