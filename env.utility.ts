import Utility from "./utility.ts";

export class EnvUtility {
  static get_alias_file(out: any) {
    let alias_file = out.XPROJ_ALIAS;
    if (!Utility.path.exists(alias_file)) {
      alias_file = `${out.XDEV_ROOT}\\env\\${out.XPROJ_PROJECT}.als`;
    }
    if (!Utility.path.exists(alias_file)) {
      alias_file = `${out.XDEV_ROOT}\\env\\${out.XPROJ_PROJECT_BASE}.als`;
    }
    if (!Utility.path.exists(alias_file)) {
      alias_file = `${out.XDEV_ROOT}\\env\\${out.XPROJ_PROJECT}\\env.als`;
    }
    if (!Utility.path.exists(alias_file)) {
      alias_file = `${out.XDEV_ROOT}\\env\\${out.XPROJ_PROJECT_BASE}\\env.als`;
    }
    if (!Utility.path.exists(alias_file)) {
      alias_file = `${out.XDEV_ROOT}\\env\\CommonEnv.als`;
    }
    return alias_file;
  }
}
