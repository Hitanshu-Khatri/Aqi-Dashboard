from pathlib import Path

import matplotlib.pyplot as plt


def load_required_images(base_dir: Path):
    """Load all required images and return them in plotting order."""
    image_specs = [
        ("Residual Distribution", base_dir / "residual_plot.png"),
        ("Actual vs Predicted", base_dir / "actual_vs_predicted.png"),
        ("MAE Comparison", base_dir / "mae_comparison.png"),
        ("Composite Score", base_dir / "composite_score.png"),
    ]

    missing = [str(path) for _, path in image_specs if not path.exists()]
    if missing:
        missing_text = "\n".join(missing)
        raise FileNotFoundError(
            "The following required image files were not found:\n"
            f"{missing_text}\n\n"
            "Run this script from the folder that contains the 4 PNG files, "
            "or move the files there."
        )

    loaded = [(title, plt.imread(path)) for title, path in image_specs]
    return loaded


def create_dashboard(images):
    """Create a 2x2 subplot dashboard with the provided image data."""
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    axes = axes.flatten()

    for ax, (title, img) in zip(axes, images):
        ax.imshow(img)
        ax.set_title(title, fontsize=12)
        ax.axis("off")

    fig.suptitle("AQI Model Performance Dashboard", fontsize=16, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    return fig


def save_dashboard(fig, output_dir: Path):
    """Save the dashboard to outputs/final_dashboard.png with dpi=300."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "final_dashboard.png"
    fig.savefig(output_path, dpi=300)
    return output_path


def main():
    base_dir = Path.cwd()
    images = load_required_images(base_dir)
    fig = create_dashboard(images)
    output_path = save_dashboard(fig, base_dir / "outputs")
    print(f"Dashboard saved to: {output_path}")
    plt.show()


if __name__ == "__main__":
    main()
