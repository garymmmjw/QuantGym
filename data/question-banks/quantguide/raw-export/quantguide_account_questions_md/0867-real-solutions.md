# QuantGuide Question

## 867. Real Solutions

**Metadata**

- ID: `OkjGPPzVeT3ZLL1B5JNg`
- URL: https://www.quantguide.io/questions/real-solutions
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: Original
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-28 15:05:09 America/New_York
- Last Edited By: Gabe

### 题干

Let $M$ and $N$ be IID Unif$(0,1)$ random variables. Let $p(c)$ be the probability that $Mx^3 + Nx = c$ has a real solution in the interval $(0,1)$, where $0 < c < 2$. $p(c)$ can be written in the form $$1 - \left[(ac^2 + bc +d)I_{(0,1)}(c) + (rc^2 + sc + t)I_{(1,2)}(c)\right]$$ where $I_{(a,b)}(x) = 1$ if $x \in (a,b)$ and $0$ otherwise. Furthermore, all of $a,b,d,r,s,t$ are rational numbers. Find $a+b+d+r+s+t$.

### Hint

Use the intermediate value theorem to get a condition on $M$ and $N$ for there to be a real solution.

### 解答

Define $f(x) = Mx^3 + Nx - c$. If there a zero in the interval $(0,1)$ AKA some $x^* \in (0,1)$ such that $f(x^*) = 0$, then we  must have that $f(0) $ and $f(1)$ are of opposite signs. This is by the intermediate value theorem. One can show that $\mathbb{P}[f(x) \hspace{3pt} \text{is strictly increasing}] = 1$ by taking the derivative and noting it is always positive for $x \in (0,1)$. We have that $f(0) = -c$ and $f(1) = M+N - c$. We know that since $M, N \sim \text{Unif}(0,1)$, they are both positive values. They only take values between $0$ and $1$ individually.

$$$$

 For $0 < c < 2$, we have that $f(0) = -c < 0$ and $f(1) = M+N - c$. If we want $f(1) > 0$, then $M+N - c > 0$, so $M+N > c$. Thus, we want the value $\mathbb{P}[M+N > c]$. However, this is easier stated as $1 - \mathbb{P}[M+N \leq c]$. This is essentially asking for the CDF of $M+N$. Using convolution (or any other method you prefer), you get that the PDF $M+N$ is given by $$f(z) = zI_{(0,1)}(z) + (2-z)I_{[1,2)}(z)$$ To find the CDF, we need to actually split up into cases of $0 < c < 1$ and $1 \leq c < 2$, as the PDF splits there. For $0 < c < 1$, this is just the integral $$\displaystyle \int_0^c z dz = \dfrac{c^2}{2}$$ as we are solely on the first branch of that indicator with $0 < c < 1$. If $1 \leq c < 2$, we can write this integral as $$\displaystyle \int_0^c f(z)dz = \int_0^1 f(z)dz + \int_1^c f(z)dz$$ 

The first integral evaluates to our previous expression evaluated at $1$, which is just $\dfrac{1}{2}$, and our second becomes the integral $\displaystyle \int_1^c (2-z)dz = \left(2z - \dfrac{z^2}{2}\right)\Big|_1^c = 2c - \dfrac{c^2}{2} - \dfrac{3}{2}$. Thus, for $1 \leq c < 2$, we have the CDF as $$\dfrac{1}{2} + \left(2c - \dfrac{c^2}{2} - \dfrac{3}{2}\right) = 2c - \dfrac{c^2}{2} - 1$$ 


Thus, our total CDF is given by $$p(c) = \mathbb{P}[M+N \leq c] = \dfrac{c^2}{2}I_{(0,1)}(c) + \left(2c - \dfrac{c^2}{2} - 1\right)I_{[1,2)}(c)$$ This means that $a = \dfrac{1}{2}, b=d = 0, r = -\dfrac{1}{2}, s = 2, t = -1$. Adding up all of this, we get $1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "OkjGPPzVeT3ZLL1B5JNg",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 15:05:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7071758,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Real Solutions",
    "topic": "probability",
    "urlEnding": "real-solutions",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "OkjGPPzVeT3ZLL1B5JNg",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Real Solutions",
    "topic": "probability",
    "urlEnding": "real-solutions"
  }
}
```
