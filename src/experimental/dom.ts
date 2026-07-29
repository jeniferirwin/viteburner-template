export class UIMod {
    static divTerminal = "MuiTypography-root MuiTypography-body1 css-e6cpsj-primary";
    static insertTerminalLine(divText: string = "", divId: string = "", divClass: string = "")
    {
        var terminal = document.getElementById("terminal");
        var idfmt = "";
        var classfmt = "";
        if (divId !== "") idfmt = `id="${divId}"`;
        if (divClass !== "") {
            classfmt = `class="${divClass}"`;
        } else {
            classfmt = `class="${UIMod.divTerminal}"`;
        }
        var divHTML = `<li><div ${idfmt} ${classfmt}">${divText}</div></li>`;
        terminal?.insertAdjacentHTML("beforeend", divHTML);
    }
}