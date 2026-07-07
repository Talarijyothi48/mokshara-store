# GitHub Collaboration Guide: Granting Access to `jyothsnaganji77`

To allow **Jyothsna (jyothsnaganji77)** to upload new blogs weekly to the website, she needs write access to the website's GitHub repository. Follow this step-by-step guide to set up access.

---

## Part 1: Steps for the Site Owner (Jyothi Talari)

As the owner of the GitHub account, you need to invite Jyothsna as a collaborator.

1. **Log in to GitHub**:
   Go to [GitHub](https://github.com/) and sign in to your account (`Talarijyothi48`).

2. **Navigate to the Repository**:
   Go to the website repository: [https://github.com/Talarijyothi48/mokshara-store](https://github.com/Talarijyothi48/mokshara-store).

3. **Open Settings**:
   * Click on the **Settings** tab (the gear icon) at the top of the repository page.
   * In the left sidebar, click on **Collaborators** (under the "Access" section).
   * *Note: You may be asked to re-enter your GitHub password for security.*

4. **Add Collaborator**:
   * Click the green **Add people** button.
   * In the search box, type **`jyothsnaganji77`** (or her email address associated with GitHub).
   * Select her user profile from the dropdown.
   * Choose the **Write** permission role (which allows pushing changes and uploading files).
   * Click **Add jyothsnaganji77 to this repository**.

*Repeat these steps for the second repository if you want her to draft articles there: [https://github.com/Talarijyothi48/mokshara-blog-posts](https://github.com/Talarijyothi48/mokshara-blog-posts).*

---

## Part 2: Steps for the Collaborator (Jyothsna)

Once invited, Jyothsna must accept the invitation to gain access.

1. **Check Email**:
   GitHub will send an email invitation to the address linked with the `jyothsnaganji77` account. Click the **View Invitation** link in that email.

2. **Accept Online**:
   Alternatively, log into GitHub and go directly to:
   * **[https://github.com/Talarijyothi48/mokshara-store/invitations](https://github.com/Talarijyothi48/mokshara-store/invitations)**
   * Click **Accept Invitation**.

---

## Part 3: Collaboration Editing Methods

After accepting the invitation, Jyothsna can choose one of the following methods to manage and upload blogs:

### Option A: Using the GitHub Web Interface (Easiest — No installation needed)
1. Go to the repository: `https://github.com/Talarijyothi48/mokshara-store`.
2. Navigate to folders (e.g., `assets/` to upload images).
3. Click **Add file** -> **Upload files** to upload images.
4. Navigate to `blog/` and edit files or create new `.html` files directly in the browser by clicking **Add file** -> **Create new file**.

### Option B: Clone the Repository to edit locally (Recommended for using the script)
1. Install Git and Python 3 on your local computer.
2. Open terminal/Command Prompt and run:
   ```bash
   git clone https://github.com/Talarijyothi48/mokshara-store.git
   ```
3. Use the automated blog publishing script to draft, generate, and update sitemaps in seconds (see [weekly_blog_upload_guide.md](weekly_blog_upload_guide.md)).
