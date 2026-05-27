# QuantGuide Question

## 55. Positive Brownian II

**Metadata**

- ID: `Vy2YtbfpQO42iB5yO3zH`
- URL: https://www.quantguide.io/questions/positive-brownian-ii
- Topic: pure math
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: https://quant.stackexchange.com/questions/28241/given-brownian-motion-b-t-b-s-and-ts-how-to-calculate-pb-t0-b-s0
- Tags: Stochastic Calculus, Calculus
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 12:56:53 America/New_York
- Last Edited By: Gabe

### 题干

Let $B_t$ be a standard Brownian Motion. Find $\mathbb{P}[B_2 > 0, B_8 > 0]$.

### Hint

Start off with a similar trick to Positive Brownian I. Attempt converting the resulting integral to polar coordinates.

### 解答

We are going to start off with a similar trick to Positive Brownian I. We are instead going to compute $\mathbb{P}[B_2 > 0, B_8 < 0]$. Then, we can receive our result of $\mathbb{P}[B_2 > 0, B_8 < 0] = \mathbb{P}[B_2 > 0] - \mathbb{P}[B_2 > 0, B_8 < 0]$. The first term of this is clearly just $\dfrac{1}{2}$, as $B_2 \sim N(0,2)$, which is symmetric about $0$.

$$$$

We are going to solve this question for all $0 \leq s < t$. Set $X_t=B_t-B_s$ and $Y_s=-B_s$. $X_t \sim N(0, t-s)$ by the stationarity of Brownian Motion. Furthermore, by independent increments, we know that $X_t$ and $Y_s$ are independent. Letting $I$ be our probability of interest, we have that 
$$
\begin{gathered}
I=P\left[B_t>0, B_s<0\right]=P\left[B_t-B_s>-B_s,-B_s>0\right]=P\left[X_t>Y_s, Y_s>0\right] \\
I=\frac{1}{2 \pi \sqrt{s(t-s)}} \int_0^{\infty} \int_y^{\infty} \exp \left(-\frac{y^2}{2 s}-\frac{x^2}{2(t-s)}\right) d x d y
\end{gathered}
$$
The integral arises from plugging in the PDFs of $X_t$ and $Y_s$ and then integrating first where $x > y$ and then where $y > 0$. This integral looks difficult to evaluate. We know that normal distributions have radial symmetry in the plane, so attempting to convert to polar coordinates is a good move. To get rid of the denominators in the exponentials, we use the standard $x = r\cos\theta$ and $y = r\sin\theta$, but with extra terms of $\sqrt{s}$ and $\sqrt{t-s}$ to cancel once they are squared. Namely, we have
$$
\begin{gathered}
y=r \sqrt{s}\sin \theta \\
x= r\sqrt{t-s} \cos \theta
\end{gathered}
$$

As we are attempting to switch to a different coordinate system, we need to evaluate the Jacobian of our transformation. Namely, this is

$$\begin{aligned} & d y d x=J d r d \theta \\ & d y d x=\left|\begin{array}{ll}\frac{\partial x}{\partial r} & \frac{\partial x}{\partial \theta} \\ \frac{\partial y}{\partial r} & \frac{\partial y}{\partial \theta}\end{array}\right| d r d \theta \\ & d y d x=\left|\begin{array}{cc}\sqrt{s} \cos \theta & -\sqrt{s} r \sin \theta \\ \sqrt{t-s} \sin \theta & \sqrt{t-s} r \cos \theta\end{array}\right| d r d \theta \\ & d y d x=\left(\sqrt{s(t-s)} r \cos ^2 \theta+\sqrt{s(t-s)} r \sin ^2 \theta\right) d r d \theta=\sqrt{s(t-s)} r d r d \theta\end{aligned}$$
Next, we need to find our integral bounds. It's fairly clear to see that $0 < r < \infty$, as there is no bound in our region. As $x > y$ and $y > 0$, this implies
$$
\sqrt{s} r \sin \theta<\sqrt{t-s} r \cos \theta
$$
By rearranging the above to isolate $\theta$, we see
$$
\tan \theta<\sqrt{\frac{t-s}{s}}
$$
Our bound must be 
$$
\theta<\tan ^{-1}\left(\sqrt{\frac{t-s}{s}}\right)=\cos ^{-1}\left(\sqrt{\frac{s}{t}}\right)
$$
The second equality just comes from writing out the triangle with side lengths $\sqrt{t-s}$ opposite, $\sqrt{s}$ adjacent, and $\sqrt{t}$ on the hypotenuse. Plugging everything into the integral above, our new integral becomes
$$
\begin{gathered}
I=\frac{1}{2 \pi} \int_0^{\cos ^{-1}\left(\sqrt{\frac{s}{t}}\right)} \int_0^{\infty} r \exp \left(-\frac{r^2}{2}\right) d r d \theta \\
I=\frac{1}{2 \pi} \int_0^{\cos ^{-1}\left(\sqrt{\frac{s}{t}}\right)}-\left.\exp \left(-\frac{r^2}{2}\right)\right|_0 ^{\infty} d \theta \\
I=\frac{1}{2 \pi} \int_0^{\cos ^{-1}\left(\sqrt{\frac{s}{t}}\right)} d \theta=\frac{1}{2 \pi} \cos ^{-1}\left(\sqrt{\frac{s}{t}}\right)
\end{gathered}
$$

Plugging in our specific values of $s = 2$ and $t = 8$, our answer is $\dfrac{1}{2\pi} \cos^{-1}\left(\dfrac{1}{2}\right) = \dfrac{1}{2\pi} \cdot \dfrac{\pi}{3} = \dfrac{1}{6}$.

$$$$

Therefore, the probability in question for us is $\dfrac{1}{2} - \dfrac{1}{6} = \dfrac{1}{3}$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "Vy2YtbfpQO42iB5yO3zH",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-9 12:56:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 409046,
    "source": "https://quant.stackexchange.com/questions/28241/given-brownian-motion-b-t-b-s-and-ts-how-to-calculate-pb-t0-b-s0",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Positive Brownian II",
    "topic": "pure math",
    "urlEnding": "positive-brownian-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "Vy2YtbfpQO42iB5yO3zH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      },
      {
        "tag": "Calculus"
      }
    ],
    "title": "Positive Brownian II",
    "topic": "pure math",
    "urlEnding": "positive-brownian-ii"
  }
}
```
