export function parseTasFileList(content) {
    let file_list = [];
    for (let line of content.split('\n')) {
        let parsed_line = parseLine(line);
        if (parsed_line) {
            file_list.push(parsed_line);
        }
    }

    return file_list;
}
function parseLine(line) {
    let tokens = [];
    let current_token = "";
    for (let char of line.split('')) {
        if (char === ',' || char === '=' || char === ':') {
            if (current_token !== "") {
                tokens.push(current_token);
                current_token = "";
            }
            tokens.push(char);
        } else if (char === ' ' || char === '\t') {
            if (current_token !== "") {
                tokens.push(current_token);
                current_token = "";
            }
        } else {
            current_token += char;
        }
    }
    if (current_token !== "") {
        tokens.push(current_token);
    }

    let level_id = "";
    let level_names = [];
    let attributes = {};


    // states:
    // 0 = in level_id
    // 1 = in level_names
    // 2 = in attribute key
    // 3 = in attribute value
    let parser_state = 0;
    let prev_token = null;
    let current_attrib_key = null;
    for (let token of tokens) {
        switch (parser_state) {
            case 0:
                if (token == ',') {
                    level_id = prev_token;
                    prev_token = null;
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
                    level_names.push(prev_token);
                    prev_token = null;
                } else if (token == '=') {
                    level_names.push(prev_token);
                    prev_token = null;
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
                    attributes[current_attrib_key] = prev_token;
                    prev_token = null;
                    current_attrib_key = null;
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
        attributes[current_attrib_key] = prev_token;
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

export function makeTasFileList(file_infos) {
    let list_str = "";
    for (let file of file_infos) {
        let file_name = file["file"];
        let level_names = file["names"];
        let attributes = file["attributes"];
        list_str += makeFileStr(file_name, level_names, attributes) + '\n';
    }
    return list_str;
}
function makeFileStr(file, names, attributes) {
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
