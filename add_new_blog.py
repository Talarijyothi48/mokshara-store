import os
import re
from datetime import datetime

# Set up paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLOG_DIR = os.path.join(BASE_DIR, "blog")
TEMPLATE_PATH = os.path.join(BLOG_DIR, "blog_post_template.html")
BLOG_INDEX_PATH = os.path.join(BLOG_DIR, "index.html")
SITEMAP_PATH = os.path.join(BASE_DIR, "sitemap.xml")

def generate_slug(title):
    # Convert to lowercase, remove non-alphanumeric, and replace spaces with hyphens
    slug = title.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    return slug

def format_content(raw_content):
    # Auto-format paragraphs and headings if it's raw text
    if "<p>" in raw_content or "<h2>" in raw_content:
        return raw_content # Already has HTML formatting
        
    paragraphs = raw_content.split('\n\n')
    formatted = []
    
    first = True
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if p.startswith('## '):
            formatted.append(f"<h2>{p[3:]}</h2>")
        elif p.startswith('### '):
            formatted.append(f"<h3>{p[4:]}</h3>")
        else:
            if first:
                formatted.append(f'<p class="drop-cap">{p}</p>')
                first = False
            else:
                formatted.append(f'<p>{p}</p>')
                
    return '\n'.join(formatted)

def main():
    print("====================================================")
    print("      MÓKSHARA BLOG UPLOAD AUTOMATION TOOL          ")
    print("====================================================")
    
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: Template not found at {TEMPLATE_PATH}")
        print("Please make sure you run this script from the 'store' directory.")
        return
        
    # Get interactive inputs
    title = input("Enter Blog Title (e.g. Caregiver Burnout signs): ").strip()
    if not title:
        print("Title cannot be empty.")
        return
        
    slug = input(f"Enter Slug (default: {generate_slug(title)}): ").strip()
    if not slug:
        slug = generate_slug(title)
    else:
        slug = generate_slug(slug)
        
    hero_subtitle = input("Enter Short Subtitle/Hook for Hero section: ").strip()
    category = input("Enter Category/Badge (e.g. Eldercare, Wellness, Somatic Healing): ").strip()
    author = input("Enter Author (default: Jyothi Talari): ").strip() or "Jyothi Talari"
    read_time = input("Enter Read Time (default: 3 min read): ").strip() or "3 min read"
    meta_description = input("Enter Meta Description (for search engines, ~150 chars): ").strip()
    keywords = input("Enter Keywords (comma separated): ").strip()
    
    hero_image = input("Enter Hero Image filename inside /assets/ (e.g. hero-caregiver-burnout.jpeg): ").strip()
    if not hero_image:
        hero_image = "hero-caregiver-burnout.jpeg"
    # Ensure it starts with /assets/
    if not hero_image.startswith("/assets/"):
        hero_image = f"/assets/{hero_image}"
        
    print("\n--- Blog Post Content Input ---")
    print("Type/paste content here. Double Enter for new paragraphs.")
    print("Use '## Heading' for main sections, '### Subheading' for sub-sections.")
    print("Type 'EOF' on a new line and press Enter when finished, or enter the path to a text file.")
    
    content_input = []
    first_line = input().strip()
    
    if os.path.exists(first_line):
        print(f"Loading content from file: {first_line}...")
        with open(first_line, 'r', encoding='utf-8') as f:
            raw_content = f.read()
    else:
        content_input.append(first_line)
        while True:
            line = input()
            if line.strip() == "EOF":
                break
            content_input.append(line)
        raw_content = '\n'.join(content_input)
        
    content_html = format_content(raw_content)
    
    # Optional FAQs
    faqs = []
    print("\n--- Optional FAQs Section ---")
    add_faq = input("Would you like to add FAQs? (y/n): ").strip().lower()
    if add_faq == 'y':
        while True:
            q = input("Enter FAQ Question (or press Enter to finish FAQs): ").strip()
            if not q:
                break
            a = input("Enter FAQ Answer: ").strip()
            if not a:
                break
            faqs.append((q, a))
            
    faq_html = ""
    for q, a in faqs:
        faq_html += f"""            <div class="faq-item">
              <button class="faq-trigger">{q}</button>
              <div class="faq-content">
                <div class="faq-content-inner">
                  <p>{a}</p>
                </div>
              </div>
            </div>\n"""
            
    # Load and populate template
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template = f.read()
        
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Replacements
    populated = template
    populated = populated.replace("{{TITLE}}", title)
    populated = populated.replace("{{META_DESCRIPTION}}", meta_description)
    populated = populated.replace("{{KEYWORDS}}", keywords)
    populated = populated.replace("{{SLUG}}", slug)
    populated = populated.replace("{{HERO_IMAGE}}", hero_image)
    populated = populated.replace("{{HERO_SUBTITLE}}", hero_subtitle)
    populated = populated.replace("{{AUTHOR}}", author)
    populated = populated.replace("{{DATE}}", datetime.now().strftime("%B %Y"))
    populated = populated.replace("{{READ_TIME}}", read_time)
    populated = populated.replace("{{CATEGORY}}", category)
    populated = populated.replace("{{CONTENT}}", content_html)
    populated = populated.replace("{{FAQ_ACCORDION}}", faq_html)
    populated = populated.replace("{{DATE_PUBLISHED}}", today)
    populated = populated.replace("{{DATE_MODIFIED}}", today)
    
    # Save the new file
    output_file_name = f"{slug}.html"
    output_path = os.path.join(BLOG_DIR, output_file_name)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(populated)
    print(f"\n[1/3] Created new blog page: blog/{output_file_name}")
    
    # For backward-compatibility redirects, create a copy in the legacy folder path /2026/07/slug.html if it exists
    legacy_dir = os.path.join(BASE_DIR, "2026", "07")
    os.makedirs(legacy_dir, exist_ok=True)
    legacy_path = os.path.join(legacy_dir, output_file_name)
    with open(legacy_path, 'w', encoding='utf-8') as f:
        f.write(populated)
    print(f"      Legacy redirection copy created: 2026/07/{output_file_name}")

    # Update blog/index.html (inserts card at the top of the grid)
    if os.path.exists(BLOG_INDEX_PATH):
        with open(BLOG_INDEX_PATH, 'r', encoding='utf-8') as f:
            index_content = f.read()
            
        # Create the card HTML snippet
        card_html = f"""      <!-- Article: {title} -->
      <article class="blog-card">
        <div class="blog-card-image">
          <img src="{hero_image}" alt="{title}">
          <span class="blog-card-badge">{category}</span>
        </div>
        <div class="blog-card-body">
          <div class="blog-card-meta">✍️ By {author} · {read_time}</div>
          <h3 class="blog-card-title">{title}</h3>
          <p class="blog-card-desc">
            {meta_description}
          </p>
          <a href="/blog/{output_file_name}" class="blog-card-link">Read Article ➔</a>
        </div>
      </article>\n\n"""
      
        # Insert card right after <div class="blog-grid">
        grid_marker = '<div class="blog-grid">'
        if grid_marker in index_content:
            index_content = index_content.replace(grid_marker, f"{grid_marker}\n{card_html}", 1)
            with open(BLOG_INDEX_PATH, 'w', encoding='utf-8') as f:
                f.write(index_content)
            print(f"[2/3] Updated blog landing grid index: blog/index.html")
        else:
            print("Warning: Could not find <div class=\"blog-grid\"> in blog/index.html. Grid index not updated.")
            
    # Update sitemap.xml
    if os.path.exists(SITEMAP_PATH):
        with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
            sitemap_content = f.read()
            
        sitemap_entry = f"""  <!-- Article: {title} -->
  <url>
    <loc>https://mokshara.indevs.in/blog/{output_file_name}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>https://mokshara.indevs.in{hero_image}</image:loc>
      <image:title>{title}</image:title>
      <image:caption>{meta_description}</image:caption>
    </image:image>
  </url>\n\n"""
  
        # Insert sitemap entry before </urlset>
        if "</urlset>" in sitemap_content:
            sitemap_content = sitemap_content.replace("</urlset>", f"{sitemap_entry}</urlset>", 1)
            with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
                f.write(sitemap_content)
            print(f"[3/3] Updated sitemap: sitemap.xml")
        else:
            print("Warning: Could not find </urlset> in sitemap.xml. Sitemap not updated.")

    print("\n====================================================")
    print("SUCCESS: Blog article added to the site locally!")
    print("====================================================")
    print("\nNext, run these commands to push the changes to GitHub Pages:")
    print("  git add .")
    print(f'  git commit -m "Publish blog: {title}"')
    print("  git push origin main")
    print("====================================================")

if __name__ == "__main__":
    main()
