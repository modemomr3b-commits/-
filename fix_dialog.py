import sys
def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    target = """            <button
              onClick={onDownloadZip}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brq-gold to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:-translate-y-0.5"
            >
              <FileArchive size={20} /> تحميل كملف مضغوط (ZIP)
            </button>"""

    replacement = """            <button
              onClick={onDownloadZip}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brq-gold to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:-translate-y-0.5"
            >
              <FileArchive size={20} /> حفظ في مجلد كصور عادية
            </button>"""

    target2 = """              <button
                onClick={onDownloadAllElastic}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-400 text-white hover:from-emerald-500 hover:to-emerald-300 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
              >
                <FileArchive size={20} /> تحميل جميع اللاستيك في الموقع (ZIP)
              </button>"""
              
    replacement2 = """              <button
                onClick={onDownloadAllElastic}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-400 text-white hover:from-emerald-500 hover:to-emerald-300 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
              >
                <FileArchive size={20} /> تحميل جميع اللاستيك في الموقع (مجلد)
              </button>"""
              
    content = content.replace(target, replacement)
    content = content.replace(target2, replacement2)
    
    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/components/shared/DownloadChoiceDialog.tsx')
