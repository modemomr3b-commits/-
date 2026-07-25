with open("src/components/admin/UserManager.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)

# Wait, let's just write the correct ending
with open("src/components/admin/UserManager.tsx", "w", encoding="utf-8") as f:
    text = "".join(lines)
    # The syntax error from esbuild: 435:6: ERROR: Unexpected closing "div" tag does not match opening "button" tag
    # Let's just find the end
    end_str = """                           </tr>
                        )})}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
"""
    # Replace the end
    import re
    text = re.sub(r"                           <\/tr>\s*\)\}\)\}\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}[\s\S]*", end_str, text)
    f.write(text)
