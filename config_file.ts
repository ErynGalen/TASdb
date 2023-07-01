export type ConfigLine = {
    id: string,
    is_directory: boolean,
    names: string[],
}

export function parseConfigFile(content: string): ConfigLine[] {
    let config: ConfigLine[] = [];
    for (let line of content.split('\n')) {
        let parsed_line = parseLine(line);
        if (parsed_line) {
            config.push(parsed_line);
        }
    }

    // add directories with the form `<file>.d` to the config
    for (let line in config) {
        if (!config[line].is_directory) {
            let dir_id = config[line].id + '.d';
            let dir_names: string[] = [];
            for (let name of config[line].names) {
                dir_names.push(name + '.d');
            }
            config.push({ id: dir_id, is_directory: true, names: dir_names });
        }
    }

    return config;
}
function parseLine(line: string): ConfigLine | null {
    let id: string = "";
    let is_directory: boolean = false;
    let names: string[] = [];

    let parser_in_names: boolean = false;
    let prev_name: string | null = null;

    for (let char of line.split('')) {
        if (char == '/') {
            if (parser_in_names || prev_name) {
                console.error("directory specifier `/` can only occur before the names (" + line + "), prev name was " + prev_name);
            }
            is_directory = true;
        } else if (char == ',') {
            if (!prev_name) {
                console.error("comma must be preceded with a string, got nothing (" + line + ")");
                return null;
            }
            if (parser_in_names) {
                names.push(prev_name);
            } else {
                id = prev_name;
                parser_in_names = true;
            }
            prev_name = null;
        } else if (char == ' ' || char == '\t') {
            // ignore whitespaces
        } else {
            if (prev_name) {
                prev_name += char;
            } else {
                prev_name = char;
            }
        }
    }
    if (prev_name) {
        if (parser_in_names) {
            names.push(prev_name);
        } else {
            id = prev_name;
            parser_in_names = true;
        }
    }
    if (id == "") {
        return null; // line was empty
    }
    names.push(id); // allow refering level by their file names;
    return { id: id, is_directory: is_directory, names: names };
}

export function makeConfigFile(config: ConfigLine[]): string {
    let config_str = "";
    for (let line of config) {
        if (!line.id.endsWith('.d')) { // don't save directories automatically added
            config_str += makeConfigLineStr(line.id, line.is_directory, line.names) + '\n';
        }
    }
    return config_str;
}
function makeConfigLineStr(id: string, is_directory: boolean, names: string[]) {
    let ret = `${is_directory ? '/' : ''}${id}`;
    for (let name of names) {
        if (name != id) {
            ret += ", " + name;
        }
    }
    return ret;
}

export function idFromName(config: ConfigLine[], name: string): number | null {
    let nth: number = 0;
    for (let line of config) {
        for (let current_name of line.names) {
            if (current_name == name) {
                return nth;
            }
        }
        nth += 1;
    }
    return null;
}
