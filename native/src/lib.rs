use dll_syringe::{process::OwnedProcess, Syringe};
use neon::prelude::*;

fn inject(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let dll_path = cx.argument::<JsString>(0)?.value(&mut cx);
    let Some(proc) = OwnedProcess::find_first_by_name("osu!") else {
        return Ok(cx.boolean(false));
    };

    let syringe = Syringe::for_process(proc);
    match syringe.find_or_inject(dll_path) {
        Ok(output) => output,
        Err(err) => return cx.throw_error(format!("{err:#?}")),
    };

    Ok(cx.boolean(true))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("inject", inject)?;
    Ok(())
}
