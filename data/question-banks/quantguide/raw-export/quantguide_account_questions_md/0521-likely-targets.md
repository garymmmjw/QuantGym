# QuantGuide Question

## 521. Likely Targets I

**Metadata**

- ID: `X43EeolWKFBHRDhk6Dlm`
- URL: https://www.quantguide.io/questions/likely-targets
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: DE Shaw
- Source: desco
- Tags: Games, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 13:14:36 America/New_York
- Last Edited By: Gabe

### 题干

Two linear targets, say $A$ and $B$, of radius $\varepsilon << 1$ are placed on an infinitely long line. The targets are centered at $x_A = -1$ and $x_B = 3$. In other words, target $A$ covers the interval $[1-\varepsilon, 1+\varepsilon]$, and similarly with target $B$. You have one dart to shoot at the line. Your goal is to maximize your probability of hitting one of the targets. You can choose where to center your throw on the line. If you select to center your dart at $\mu$, the actual position your dart lands at is $X \sim N(\mu,4)$. Find the value of $\mu$ that maximizes your chances of hitting a target. If necessary, round your answer to the nearest hundredth.

### Hint

The key here is to note that since the targets are of extremely small radius, we can essentially treat them as points. The approximate probability we hit target $A$ would just be the $f(x_A)\varepsilon$, where $f(x_A)$ is the probability density at point $A$. Since the two targets are disjoint, our goal is to maximize the sum of the probability densities.

### 解答

The key here is to note that since the targets are of extremely small radius, we can essentially treat them as points. The approximate probability we hit target $A$ would be approximately $f(x_A)\varepsilon$, where $f(x_A)$ is the probability density at point $A$. A similar statement holds for $B$. Since the two targets are disjoint, our goal is to maximize the sum of the probability densities. Our probability density here is dependent on what $\mu$ we select. Therefore, as a function of $\mu$, we need to maximize $$f(\mu) = \dfrac{1}{2\sqrt{2\pi}}\left(e^{-\frac{(-1-\mu)^2}{8}} + e^{-\frac{(3-\mu)^2}{8}}\right)$$ The two interior terms are just the density of a $N(\mu,4)$ distribution at $-1$ and $3$. To do this, we take the derivative and set it equal to $0$. In particular, $$f'(\mu) = \dfrac{1}{2\sqrt{2\pi}}\left[\dfrac{-1-\mu}{4}e^{-\frac{(-1-\mu)^2}{8}} + \dfrac{3-\mu}{4}e^{-\frac{(3-\mu)^2}{8}}\right] = 0$$ In particular, note that if $\mu = 1$, then the two terms inside are the same but of opposite sign by symmetry, so $\mu = 1$ is a critical point. One can verify that this is indeed a maxima, so $\mu = 1$ is our answer. This intuitively makes sense, as the symmetry of the normal distribution should imply that the maxima would be symmetric in both points for our target. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "X43EeolWKFBHRDhk6Dlm",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 13:14:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4151695,
    "source": "desco",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Likely Targets I",
    "topic": "probability",
    "urlEnding": "likely-targets",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "id": "X43EeolWKFBHRDhk6Dlm",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Likely Targets I",
    "topic": "probability",
    "urlEnding": "likely-targets"
  }
}
```
