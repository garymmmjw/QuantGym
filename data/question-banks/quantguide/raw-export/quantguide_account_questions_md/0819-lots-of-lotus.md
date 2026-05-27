# QuantGuide Question

## 819. Lots of LOTUS

**Metadata**

- ID: `bN627eyEmh7Q8oG8f6iA`
- URL: https://www.quantguide.io/questions/lots-of-lotus
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:13:34 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $X \sim N(0,1)$ and define $Z = e^{\theta X - \dfrac{1}{2}\theta^2}$. What is $\mathbb{E}[Z]$?

### Hint

The MGF of $X$ is $m(\theta) = e^{\frac{1}{2} \theta^2}$.

### 解答

To find $\mathbb{E}[Z]$, this is equivalent to finding $\mathbb{E}[e^{\theta X - \frac{1}{2}\theta^2}]$. Note that $\theta \in \mathbb{R}$, so this is the same as $e^{-\frac{1}{2}\theta^2}\mathbb{E}[e^{\theta X}]$. Note that $\mathbb{E}[e^{\theta X}]$ is just the MGF of $X$. We can find the MGF of $X$ quickly. $X$ has PDF $f(x) = \dfrac{1}{\sqrt{2\pi}}e^{-\frac{x^2}{2}}$, so $$\mathbb{E}[e^{\theta X}] = \displaystyle \int_{\mathbb{R}} e^{\theta x} \cdot \dfrac{1}{\sqrt{2\pi}}e^{-\frac{x^2}{2}} dx$$ $$= \int_{\mathbb{R}} \dfrac{1}{\sqrt{2\pi}}e^{-\frac{x^2}{2} + \theta x} dx$$ $$= \int_{\mathbb{R}} \dfrac{1}{\sqrt{2\pi}}e^{-\frac{1}{2}[(x-\theta)^2 - \theta^2]} dx$$ $$= e^{\frac{1}{2}\theta^2} \int_{\mathbb{R}} \dfrac{1}{\sqrt{2\pi}}e^{-\frac{(x-\theta)^2}{2}} dx$$ The integrand inside is the PDF of a $N(\theta,1)$ distribution, so the integral is just 1. Therefore, the MGF of $X$ is $e^{\frac{1}{2}\theta^2}$, implying $\mathbb{E}[Z] = e^{\frac{1}{2}\theta^2} \cdot e^{-\frac{1}{2}\theta^2} = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bN627eyEmh7Q8oG8f6iA",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:13:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6716269,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Lots of LOTUS",
    "topic": "statistics",
    "urlEnding": "lots-of-lotus"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "bN627eyEmh7Q8oG8f6iA",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Lots of LOTUS",
    "topic": "statistics",
    "urlEnding": "lots-of-lotus"
  }
}
```
