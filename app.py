import os

import streamlit as st
import google.generativeai as genai


st.set_page_config(page_title="AI Smart Learning Assistant", page_icon="🎓", layout="wide")
st.markdown(
    """
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
      }

      .stApp {
        background: radial-gradient(1400px 700px at 10% -10%, #1e293b 0%, #0b1120 55%, #020617 100%);
        color: #e2e8f0;
      }

      .hero-wrap {
        border: 1px solid rgba(71, 85, 105, 0.45);
        border-radius: 18px;
        padding: 1.15rem 1.2rem;
        margin-bottom: 1.1rem;
        background: rgba(15, 23, 42, 0.72);
        backdrop-filter: blur(6px);
        box-shadow: 0 18px 40px rgba(2, 6, 23, 0.45);
      }

      .hero-title {
        font-size: 1.9rem;
        font-weight: 800;
        letter-spacing: -0.015em;
        color: #ffffff;
        margin: 0;
      }

      .hero-subtitle {
        margin-top: 0.3rem;
        margin-bottom: 0;
        color: #94a3b8;
        font-size: 0.95rem;
      }

      .section-card {
        border: 1px solid rgba(71, 85, 105, 0.45);
        border-radius: 16px;
        padding: 1rem 1rem 0.7rem;
        margin-bottom: 1rem;
        background: rgba(15, 23, 42, 0.62);
        backdrop-filter: blur(6px);
        box-shadow: 0 14px 30px rgba(2, 6, 23, 0.35);
      }

      .section-label {
        font-size: 0.95rem;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 0.5rem;
      }

      .response-card {
        border: 1px solid rgba(99, 102, 241, 0.45);
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%);
        padding: 1rem;
        color: #e2e8f0;
        line-height: 1.75;
        letter-spacing: 0.01em;
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.42);
      }

      .response-header {
        margin: 0 0 0.65rem;
        font-size: 1.02rem;
        font-weight: 700;
        color: #c7d2fe;
      }

      .helper-note {
        border-left: 4px solid #818cf8;
        border-radius: 10px;
        background: rgba(30, 41, 59, 0.55);
        padding: 0.75rem 0.9rem;
        margin-top: 0.45rem;
        color: #cbd5e1;
        font-size: 0.9rem;
      }

      div.stButton > button {
        width: 100%;
        border-radius: 11px;
        border: 0;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
        padding-top: 0.62rem;
        padding-bottom: 0.62rem;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.38);
        transition: all 0.22s ease;
      }

      div.stButton > button:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(99, 102, 241, 0.5);
      }

      div.stButton > button:focus:not(:active) {
        border: 1px solid #a5b4fc;
        outline: none;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="hero-wrap">
      <p class="hero-title">🎓 AI Smart Learning Assistant</p>
      <p class="hero-subtitle">Professional Gemini test console for explain, summary, quiz, revision, and mentor guidance.</p>
    </div>
    """,
    unsafe_allow_html=True,
)


api_key = os.environ.get("GCP_API_KEY")

if not api_key:
    st.error("Missing GCP_API_KEY environment variable.")
    st.info("Set it before running, for example: export GCP_API_KEY='your_key_here'")
    st.stop()


genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")


st.markdown('<div class="section-card">', unsafe_allow_html=True)
st.markdown('<div class="section-label">Input Workspace</div>', unsafe_allow_html=True)
col_mode, col_topic = st.columns([1, 2], gap="large")
with col_mode:
    mode = st.selectbox(
        "Learning Mode",
        ["explain", "summary", "quiz", "revision", "assistant"],
        index=0,
    )
with col_topic:
    topic = st.text_input(
        "Topic Input",
        placeholder="e.g., Quadratic equations, Photosynthesis, Network protocols",
    )

input_data = st.text_area(
    "Study Notes / Prompt",
    height=220,
    placeholder="Paste your detailed notes or your exact question here...",
)
st.markdown(
    '<div class="helper-note">Tip: Add context, formulas, or examples for better learning outputs.</div>',
    unsafe_allow_html=True,
)
st.markdown("</div>", unsafe_allow_html=True)


system_prompts = {
    "explain": "You are a beginner-friendly tutor. Explain the concept clearly with simple examples.",
    "summary": "Summarize the content into concise, high-yield bullet points for revision.",
    "quiz": "Generate exactly 5 multiple-choice questions from the content.",
    "revision": "Create short flashcards in this format: Q: ... and A: ...",
    "assistant": "Act as an academic mentor. Give study strategy, a practical plan, and end with an encouraging question.",
}


if st.button("Generate", type="primary"):
    if not topic.strip() and not input_data.strip():
        st.warning("Please enter a topic or prompt first.")
    else:
        combined_input = input_data.strip()
        if topic.strip():
            combined_input = f"Topic: {topic.strip()}\n\n{combined_input}".strip()

        prompt = (
            f"Mode: {mode}\n\n"
            f"Instruction: {system_prompts[mode]}\n\n"
            f"Input:\n{combined_input}"
        )
        with st.spinner("Generating response from Gemini..."):
            try:
                response = model.generate_content(prompt)
                output_text = (response.text or "").strip()
                st.markdown(
                    f"""
                    <div class="response-card">
                      <p class="response-header">AI Response ({mode.title()} Mode)</p>
                      <div>{(output_text if output_text else "No response generated.").replace('\n', '<br/>')}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            except Exception as exc:
                st.error(f"Gemini request failed: {exc}")
