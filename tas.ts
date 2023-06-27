export type FileInfo = {
    file: string,
    names: string[],
    attributes: { [name: string]: string },
}

export function parseTasFileList(content: string): FileInfo[] {
    let file_list: FileInfo[] = [];
    for (let line of content.split('\n')) {
        let parsed_line = parseLine(line);
        if (parsed_line) {
            file_list.push(parsed_line);
        }
    }

    return file_list;
}
function parseLine(line: string): FileInfo | null {
    let tokens: string[] = [];
    let current_token: string = "";
    for (let char of line.split('')) {
        if (char == ',' || char == '=' || char == ':') {
            if (current_token != "") {
                tokens.push(current_token);
                current_token = "";
            }
            tokens.push(char);
        } else if (char == ' ' || char == '\t') {
            if (current_token != "") {
                tokens.push(current_token);
                current_token = "";
            }
        } else {
            current_token += char;
        }
    }
    if (current_token != "") {
        tokens.push(current_token);
    }

    let level_id: string = "";
    let level_names: string[] = [];
    let attributes: { [name: string]: string } = {};


    // states:
    // 0 = in level_id
    // 1 = in level_names
    // 2 = in attribute key
    // 3 = in attribute value
    let parser_state: number = 0;
    let prev_token: string | null = null;
    let current_attrib_key: string | null = null;
    for (let token of tokens) {
        switch (parser_state) {
            case 0:
                if (token == ',') {
                    if (prev_token) {
                        level_id = prev_token;
                        prev_token = null;
                    }
                    parser_state = 1;
                } else {
                    if (prev_token) {
                        console.error("cannot have multiple level_id: line " + line + "-> " + token);
                        return null;
                    }
                    prev_token = token;
                }
                break;
            case 1:
                if (token == ',') {
                    if (prev_token) {
                        level_names.push(prev_token);
                        prev_token = null;
                    }
                } else if (token == '=') {
                    if (prev_token) {
                        level_names.push(prev_token);
                        prev_token = null;
                    }
                    parser_state = 2;
                } else {
                    if (prev_token) {
                        console.error("level names must be separated by commas: line " + line + "-> " + token);
                        return null;
                    }
                    prev_token = token;
                }
                break;
            case 2:
                if (token == ':') {
                    if (current_attrib_key) {
                        console.error("cannot have multiple keys for an attribute: line " + line + "-> " + prev_token);
                        return null;
                    }
                    current_attrib_key = prev_token;
                    prev_token = null;
                    parser_state = 3;
                } else {
                    if (prev_token) {
                        console.error("cannot have multiple keys for an attribute: line " + line + "-> " + token);
                        return null;
                    }
                    prev_token = token;
                }
                break;
            case 3:
                if (token == ',') {
                    if (current_attrib_key) {
                        if (prev_token) {
                            attributes[current_attrib_key] = prev_token;
                            prev_token = null;
                        } else {
                            attributes[current_attrib_key] = "";
                        }
                        current_attrib_key = null;
                    } else {
                        console.error("cannot have an attribute without a key: line " + line + "-> " + token);
                        return null;
                    }
                    parser_state = 2;
                } else {
                    if (prev_token) {
                        console.error("cannot have multiple values for an attribute: line " + line + "-> " + token);
                        return null;
                    }
                    prev_token = token;
                }
                break;
        }
    }
    if (parser_state == 3) {
        if (current_attrib_key) {
            if (prev_token) {
                attributes[current_attrib_key] = prev_token;
            } else {
                attributes[current_attrib_key] = "";
            }
        } else {
            console.error("cannot have an attribute without a key: line " + line);
            return null;
        }
    } else {
        if (parser_state == 0) {
            if (prev_token) {
                console.error("line cannot end with only a file name: line " + line);
            } // else: the line is empty
            return null;
        }
        if (parser_state == 2 && prev_token) {
            console.error("line cannot end with an attribute key: line " + line);
            return null;
        }
    }

    return { file: level_id, names: level_names, attributes: attributes };
}

export function makeTasFileList(file_infos: FileInfo[]) {
    let list_str = "";
    for (let file of file_infos) {
        let file_name = file.file;
        let level_names = file.names;
        let attributes = file.attributes;
        list_str += makeFileStr(file_name, level_names, attributes) + '\n';
    }
    return list_str;
}
function makeFileStr(file: string, names: string[], attributes: { [key: string]: string }) {
    let ret = `${file}`;
    for (let name of names) {
        ret += ", " + name;
    }
    ret += " = ";

    let n_attributes = 0;
    for (let _key in attributes) {
        n_attributes += 1;
    }
    for (let key in attributes) {
        n_attributes -= 1;
        if (n_attributes == 0) {
            ret += `${key}: ${attributes[key]}`;
        } else {
            ret += `${key}: ${attributes[key]}, `;
        }
    }

    return ret;
}

export function levelIdInList(files_info: FileInfo[], level_name: string): number | null {
    let nth: number = 0;
    for (let file of files_info) {
        for (let name of file.names) {
            if (name == level_name) {
                return nth;
            }
        }
        nth += 1;
    }
    return null;
}
