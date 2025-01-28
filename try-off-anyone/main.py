from src.test_vton import test_vton
from src.inference import test_image
import argparse
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from pathlib import Path
import base64
import sys
from gradio_client import Client, handle_file
import shutil
import random


client = Client("franciszzj/Leffa")

app = FastAPI()


directory = Path("data")

app.mount("/static", StaticFiles(directory="data"), name="static")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许的来源，可以改为 ["http://localhost:3000"]
    allow_methods=["*"],  # 允许的 HTTP 方法，例如 ["GET", "POST", "OPTIONS"]
    allow_headers=["*"],  # 允许的 HTTP 头
)


class InferenceRequest(BaseModel):
    images: list[str] 


def terminal_args():
    parser = argparse.ArgumentParser(description="Simple example of a training script.")
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--inference", action="store_true")
    return parser.parse_known_args()[0]


def main():
    args = terminal_args()
    if args.test:
        test_vton()
    elif args.inference:
        test_image()
        
def get_next_filename(directory: Path, base_name: str, extension: str) -> str:
    """
    在目錄中檢查是否有重複的文件名，並基於最高數字生成新的文件名。

    :param directory: 要檢查的目錄。
    :param base_name: 文件的基本名稱（不包括數字或擴展名）。
    :param extension: 文件的擴展名（例如 .webp）。
    :return: 新的文件名，例如 image_1.webp。
    """
    # 列出目錄中所有文件
    existing_files = [file.name for file in directory.iterdir() if file.is_file()]

    # 匹配文件名格式，例如 image_1.webp
    highest_number = 0
    for file_name in existing_files:
        if file_name.startswith(base_name) and file_name.endswith(extension):
            # 提取數字部分
            parts = file_name[len(base_name):-len(extension)].strip("_")
            if parts.isdigit():
                highest_number = max(highest_number, int(parts))

    # 新的文件名
    new_number = highest_number + 1
    new_file_name = f"{base_name}_{new_number}{extension}"
    return new_file_name
        
@app.post("/inference")
async def run_inference(request: InferenceRequest):
    """
    接收多個圖片 URL
    """
    output_dir = Path("data")
    output_dir.mkdir(exist_ok=True)  # 確保資料夾存在

    for url in request.images:
        try:
            
            test_image(url)
            
        except Exception as e:
            print(f"Error processing image from {url}: {e}")
            continue



@app.get("/inference", response_class=JSONResponse)
async def list_files():

    if not directory.exists():
        raise HTTPException(status_code=404, detail="Data directory not found")
    
    files = [file.name for file in directory.iterdir() if file.is_file() and file.name.startswith("clo") and file.suffix == ".png"]

    if not files:
        raise HTTPException(status_code=404, detail="No files found in the data directory")
    
    images = [f"http://127.0.0.1:8000/static/{file}" for file in files]
    return {"images": images}

@app.get("/tryon")
async def list_files():
    src_image_path = Path("data/model.png")
    ref_image_url = Path("data/clo1.png")

    # 確保來源圖片存在
    if not src_image_path.exists():
        raise HTTPException(status_code=404, detail="Source image (model.png) not found in data directory")

    # 使用 Gradio 客戶端進行推理
    try:
        result = client.predict(
            src_image_path=handle_file(str(src_image_path)),  # 本地的 model.png
            ref_image_path=handle_file(str(ref_image_url)),       # 遠端的參考圖片
            ref_acceleration=False,
            step=30,
            scale=2.5,
            seed=42,
            vt_model_type="viton_hd",
            vt_garment_type="upper_body",
            vt_repaint=False,
            api_name="/leffa_predict_vt"
        )
        generated_file_path=Path(result[0])
        base_name = "image"
        extension = ".webp"
        new_file_name = get_next_filename(directory, base_name, extension)
        final_path = directory / new_file_name

        # 移動文件
        shutil.move(generated_file_path, final_path)
        return {"generated_image": f"/static/{new_file_name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during try-on process: {str(e)}")
    
@app.get("/pose")
async def list_files():
    pose_number = random.randint(1, 10)
    src_image_path = Path(f"data/pose{pose_number}.jpg")
    ref_image_url = Path("data/image_1.webp")

    # 確保來源圖片存在
    if not src_image_path.exists():
        raise HTTPException(status_code=404, detail="Source image not found in data directory")

    # 使用 Gradio 客戶端進行推理
    try:
        client = Client("franciszzj/Leffa")
        result = client.predict(
                src_image_path=handle_file(str(src_image_path)),
                ref_image_path=handle_file(str(ref_image_url)),
                ref_acceleration=False,
                step=30,
                scale=2.5,
                seed=42,
                api_name="/leffa_predict_pt"
        )
        generated_file_path=Path(result[0])
        base_name = "poes_result"
        extension = ".webp"
        new_file_name = get_next_filename(directory, base_name, extension)
        final_path = directory / new_file_name

        # 移動文件
        shutil.move(generated_file_path, final_path)
        return {"generated_image": f"/static/{new_file_name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during try-on process: {str(e)}")

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
