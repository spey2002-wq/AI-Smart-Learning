import os

import streamlit as st
import google.generativeai as genai


st.set_page_config(page_title="AI Smart Learning Assistant", page_icon="🎓", layout="wide")
st.title("🎓 AI Smart Learning Assistant (Streamlit Test)")
st.caption("Quick Gemini test interface for deployment checks.")


api_key = os.environ.get("GCP_API_KEY")

if not api_key:
    st.error("Missing GCP_API_KEY environment variable.")
    st.info("Set it before running, for example: export GCP_API_KEY='your_key_here'")
    st.stop()


genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")


mode = st.selectbox(
    "Select learning mode",
    ["explain", "summary", "quiz", "revision", "assistant"],
    index=0,
)

input_data = st.text_area(
    "Enter notes, question, or topic",
    height=220,
    placeholder="Paste your study material or ask a learning question...",
)


system_prompts = {
    "explain": "You are a beginner-friendly tutor. Explain the concept clearly with simple examples.",
    "summary": "Summarize the content into concise, high-yield bullet points for revision.",
    "quiz": "Generate exactly 5 multiple-choice questions from the content.",
    "revision": "Create short flashcards in this format: Q: ... and A: ...",
    "assistant": "Act as an academic mentor. Give study strategy, a practical plan, and end with an encouraging question.",
}


if st.button("Generate", type="primary"):
    if not input_data.strip():
        st.warning("Please enter some input first.")
    else:
        prompt = f"Mode: {mode}\n\nInstruction: {system_prompts[mode]}\n\nInput:\n{input_data.strip()}"
        with st.spinner("Generating response from Gemini..."):
            try:
                response = model.generate_content(prompt)
                output_text = (response.text or "").strip()
                st.subheader("Result")
                st.write(output_text if output_text else "No response generated.")
            except Exception as exc:
                st.error(f"Gemini request failed: {exc}")
